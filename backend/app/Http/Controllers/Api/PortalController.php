<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Course;
use App\Models\CourseAssessment;
use App\Models\CourseMaterial;
use App\Models\CourseRegistration;
use App\Models\FeeStatement;
use App\Models\GradeSubmission;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PortalController extends Controller
{
    public function student(Request $request): JsonResponse
    {
        $student = $request->user()->student()
            ->with([
                'programme:id,name,slug,award',
                'courseRegistrations' => fn ($query) => $query->whereIn('status', ['registered', 'completed'])
                    ->with([
                        'course:id,programme_id,lecturer_id,code,title,credits',
                        'course.programme:id,name',
                        'course.lecturer:id,name',
                        'course.sessions',
                        'course.materials:id,course_id,title,description,original_name,mime_type,size,created_at',
                        'attendanceRecords:id,course_registration_id,class_date,status',
                    ]),
            ])
            ->firstOrFail();

        $registrationIds = $student->courseRegistrations->pluck('id');
        $results = GradeSubmission::query()
            ->with(['assessment:id,course_id,title,max_score', 'assessment.course:id,code,title', 'registration:id,student_id,course_id'])
            ->whereIn('course_registration_id', $registrationIds)
            ->where('status', 'approved')
            ->latest('approved_at')
            ->get();
        $feeStatements = FeeStatement::query()
            ->with('items:id,fee_statement_id,description,amount')
            ->where('student_id', $student->id)
            ->latest()
            ->get();

        return response()->json([
            'student' => $student->load('user:id,name,email'),
            'applications' => $request->user()->applications()->with('programme:id,name,slug')->latest()->get(),
            'registrations' => $student->courseRegistrations,
            'results' => $results,
            'fee_statements' => $feeStatements,
            'statistics' => [
                'registered_courses' => $student->courseRegistrations->where('status', 'registered')->count(),
                'attendance_percentage' => $this->attendancePercentage($registrationIds),
                'approved_results' => $results->count(),
                'outstanding_fees' => round((float) $feeStatements->sum(
                    fn (FeeStatement $statement): float => max(0, (float) $statement->total_amount - (float) $statement->amount_paid)
                ), 2),
            ],
        ]);
    }

    public function alumni(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->only('id', 'name', 'email'),
            'student' => $request->user()->student()
                ->with('programme:id,name,slug')
                ->first(['id', 'user_id', 'programme_id', 'status']),
        ]);
    }

    public function teachingOverview(Request $request): JsonResponse
    {
        $courses = Course::query()
            ->where('is_active', true)
            ->where('lecturer_id', $request->user()->id)
            ->with([
                'programme:id,name',
                'sessions',
                'registrations' => fn ($query) => $query->where('status', 'registered')
                    ->with('student:id,user_id,student_number', 'student.user:id,name,email'),
                'materials:id,course_id,title,description,original_name,mime_type,size,created_at',
                'assessments' => fn ($query) => $query->withCount([
                    'submissions as pending_submissions_count' => fn ($submissions) => $submissions->where('status', 'submitted'),
                ]),
            ])
            ->withCount(['registrations as registered_students_count' => fn ($query) => $query->where('status', 'registered')])
            ->orderBy('code')
            ->get();

        $registrations = $courses->flatMap(fn (Course $course) => $course->registrations);

        return response()->json([
            'courses' => $courses,
            'statistics' => [
                'assigned_courses' => $courses->count(),
                'enrolled_students' => $registrations->pluck('student_id')->unique()->count(),
                'pending_grade_submissions' => $courses->sum(
                    fn (Course $course): int => $course->assessments->sum('pending_submissions_count')
                ),
                'course_materials' => $courses->sum(fn (Course $course): int => $course->materials->count()),
            ],
        ]);
    }

    public function manageDashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $statistics = [];
        if ($user->hasPermissionTo('students.view')) {
            $statistics['students'] = Student::query()->count();
            $statistics['active_students'] = Student::query()->where('status', 'active')->count();
        }
        if ($user->hasPermissionTo('staff.view')) {
            $statistics['staff'] = DB::table('staff')->count();
        }
        if ($user->hasPermissionTo('courses.manage')) {
            $statistics['active_courses'] = Course::query()->where('is_active', true)->count();
        }
        if ($user->hasPermissionTo('applications.view')) {
            $statistics['pending_applications'] = DB::table('applications')
                ->whereIn('status', ['submitted', 'under_review', 'additional_documents_requested'])
                ->count();
            $statistics['applications_by_status'] = DB::table('applications')
                ->select('status', DB::raw('COUNT(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status');
        }

        return response()->json(['statistics' => $statistics]);
    }

    public function pendingGrades(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
        ]);
        $query = GradeSubmission::query()
            ->where('status', 'submitted')
            ->with([
                'assessment:id,course_id,title,max_score',
                'assessment.course:id,code,title',
                'registration:id,student_id,course_id',
                'registration.student:id,user_id,student_number',
                'registration.student.user:id,name,email',
                'registration.course:id,code,title',
                'submittedBy:id,name',
            ])
            ->latest();
        if (isset($filters['search'])) {
            $needle = '%'.mb_strtolower($filters['search']).'%';
            $query->where(fn ($submissions) => $submissions
                ->whereHas('registration.student', fn ($student) => $student
                    ->whereRaw('LOWER(student_number) LIKE ?', [$needle])
                    ->orWhereHas('user', fn ($user) => $user
                        ->whereRaw('LOWER(name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$needle])))
                ->orWhereHas('assessment.course', fn ($course) => $course
                    ->whereRaw('LOWER(code) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(title) LIKE ?', [$needle]))
                ->orWhereHas('assessment', fn ($assessment) => $assessment
                    ->whereRaw('LOWER(title) LIKE ?', [$needle])));
        }

        return response()->json($query->paginate(20)->withQueryString());
    }

    public function markAttendance(Request $request, Course $course): JsonResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $request->validate([
            'class_date' => ['required', 'date', 'before_or_equal:today'],
            'attendance' => ['required', 'array', 'min:1', 'max:200'],
            'attendance.*.student_id' => ['required', 'integer', 'distinct', 'exists:students,id'],
            'attendance.*.status' => ['required', Rule::in(['present', 'absent', 'late', 'excused'])],
            'attendance.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $records = DB::transaction(function () use ($data, $course, $request): array {
            $saved = [];
            foreach ($data['attendance'] as $entry) {
                $registration = CourseRegistration::query()
                    ->where('course_id', $course->id)
                    ->where('student_id', $entry['student_id'])
                    ->where('status', 'registered')
                    ->first();
                abort_if($registration === null, 404, 'A student is not registered in this course.');

                $saved[] = AttendanceRecord::query()->updateOrCreate(
                    ['course_registration_id' => $registration->id, 'class_date' => $data['class_date']],
                    [
                        'marked_by' => $request->user()->id,
                        'status' => $entry['status'],
                        'notes' => $entry['notes'] ?? null,
                    ]
                );
            }

            return $saved;
        });

        return response()->json(['message' => 'Attendance saved.', 'attendance' => $records]);
    }

    public function uploadMaterial(Request $request, Course $course): JsonResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'material' => ['required', 'file', 'mimes:pdf,doc,docx,ppt,pptx', 'max:20480'],
        ]);
        $path = $data['material']->store('course-materials/'.$course->id, 'local');
        abort_if($path === false, 500, 'Course material could not be stored.');

        $material = $course->materials()->create([
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'original_name' => Str::limit(basename($data['material']->getClientOriginalName()), 240, ''),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $data['material']->getMimeType() ?: 'application/octet-stream',
            'size' => $data['material']->getSize(),
        ]);

        return response()->json(['material' => $material], 201);
    }

    public function downloadMaterial(Request $request, Course $course, CourseMaterial $material): StreamedResponse
    {
        abort_unless($material->course_id === $course->id, 404);
        $user = $request->user();
        $isLecturer = $course->lecturer_id === $user->id;
        $isRegistered = $user->student()
            ->whereHas('courseRegistrations', fn ($query) => $query
                ->where('course_id', $course->id)
                ->where('status', 'registered'))
            ->exists();
        abort_unless($isLecturer || $isRegistered || $user->hasPermissionTo('courses.manage'), 403);
        abort_unless(Storage::disk($material->disk)->exists($material->path), 404);

        return Storage::disk($material->disk)->download(
            $material->path,
            basename($material->original_name),
            ['Content-Type' => $material->mime_type, 'X-Content-Type-Options' => 'nosniff']
        );
    }

    public function createAssessment(Request $request, Course $course): JsonResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255', Rule::unique('course_assessments', 'title')->where('course_id', $course->id)],
            'max_score' => ['required', 'numeric', 'gt:0', 'max:99999.99'],
            'due_at' => ['nullable', 'date'],
        ]);
        $assessment = $course->assessments()->create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($assessment, 201);
    }

    public function submitGrades(Request $request, Course $course): JsonResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $request->validate([
            'assessment_id' => ['required', 'integer', 'exists:course_assessments,id'],
            'grades' => ['required', 'array', 'min:1', 'max:200'],
            'grades.*.student_id' => ['required', 'integer', 'distinct', 'exists:students,id'],
            'grades.*.score' => ['required', 'numeric', 'min:0', 'max:99999.99'],
            'grades.*.feedback' => ['nullable', 'string', 'max:2000'],
        ]);
        $assessment = CourseAssessment::query()
            ->where('course_id', $course->id)
            ->findOrFail($data['assessment_id']);

        $submissions = DB::transaction(function () use ($data, $course, $assessment, $request): array {
            $saved = [];
            foreach ($data['grades'] as $grade) {
                abort_if((float) $grade['score'] > (float) $assessment->max_score, 422, 'A grade cannot exceed the assessment maximum score.');
                $registration = CourseRegistration::query()
                    ->where('course_id', $course->id)
                    ->where('student_id', $grade['student_id'])
                    ->where('status', 'registered')
                    ->first();
                abort_if($registration === null, 404, 'A student is not registered in this course.');

                $submission = GradeSubmission::query()->firstOrNew([
                    'assessment_id' => $assessment->id,
                    'course_registration_id' => $registration->id,
                ]);
                abort_if($submission->exists && $submission->status === 'approved', 409, 'Approved grades cannot be changed.');
                $submission->fill([
                    'submitted_by' => $request->user()->id,
                    'score' => $grade['score'],
                    'feedback' => $grade['feedback'] ?? null,
                    'status' => 'submitted',
                    'approved_by' => null,
                    'approved_at' => null,
                ])->save();
                $saved[] = $submission;
            }

            return $saved;
        });

        return response()->json(['message' => 'Grades submitted for approval.', 'submissions' => $submissions]);
    }

    public function reviewGrade(Request $request, GradeSubmission $submission): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
        ]);
        abort_unless($submission->status === 'submitted', 409, 'Only pending grade submissions can be reviewed.');
        $submission->update([
            'status' => $data['status'],
            'approved_by' => $data['status'] === 'approved' ? $request->user()->id : null,
            'approved_at' => $data['status'] === 'approved' ? now() : null,
        ]);

        return response()->json($submission->refresh());
    }

    public function financeOverview(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Finance overview is available to authorized finance staff.']);
    }

    private function authorizeCourse(Request $request, Course $course): void
    {
        abort_unless(
            $course->lecturer_id === $request->user()->id
                || $request->user()->hasPermissionTo('courses.manage'),
            403,
            'You are not assigned to this course.'
        );
    }

    private function attendancePercentage($registrationIds): float
    {
        $totals = AttendanceRecord::query()
            ->whereIn('course_registration_id', $registrationIds)
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as attended', ['present', 'late'])
            ->first();

        return (int) $totals->total === 0
            ? 0.0
            : round(((int) $totals->attended / (int) $totals->total) * 100, 1);
    }
}
