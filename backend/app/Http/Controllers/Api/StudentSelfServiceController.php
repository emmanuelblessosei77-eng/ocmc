<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\CourseRegistration;
use App\Models\RegistrationWindow;
use App\Models\Student;
use App\Models\StudentServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentSelfServiceController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        return response()->json(['student' => $this->student($request)->load('user:id,name,email', 'programme:id,name,slug,award')]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:40'],
        ]);

        $student->update($data);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'student' => $student->fresh()->load('user:id,name,email', 'programme:id,name,slug,award'),
        ]);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $request->validate([
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
        ]);

        $path = $request->file('photo')->store('student-photos', 'local');
        if ($student->profile_photo_path) {
            Storage::disk('local')->delete($student->profile_photo_path);
        }
        $student->update(['profile_photo_path' => $path]);

        return response()->json([
            'message' => 'Profile photo updated.',
            'student' => $student->fresh()->load('user:id,name,email', 'programme:id,name,slug,award'),
        ]);
    }

    public function availableCourses(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $window = RegistrationWindow::current();

        $courses = Course::query()
            ->where('is_active', true)
            ->when($student->programme_id, fn ($query) => $query->where(function ($builder) use ($student): void {
                $builder->whereNull('programme_id')->orWhere('programme_id', $student->programme_id);
            }))
            ->with(['lecturer:id,name', 'programme:id,name', 'sessions'])
            ->orderBy('code')
            ->get();

        $registeredIds = CourseRegistration::query()
            ->where('student_id', $student->id)
            ->where('status', 'registered')
            ->when($window, fn ($query) => $query
                ->where('academic_year', $window->academic_year)
                ->where('term', $window->term))
            ->pluck('course_id');

        return response()->json([
            'registration_window' => $window ? [
                'academic_year' => $window->academic_year,
                'term' => $window->term,
                'opens_at' => $window->opens_at,
                'closes_at' => $window->closes_at,
                'is_open' => $window->isOpen(),
                'max_credits' => $window->max_credits,
            ] : null,
            'registered_course_ids' => $registeredIds,
            'courses' => $courses,
        ]);
    }

    public function registerCourse(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $window = RegistrationWindow::current();
        if ($window === null || ! $window->isOpen()) {
            throw ValidationException::withMessages([
                'course_id' => ['Course registration is not open at this time.'],
            ]);
        }

        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
        ]);

        $course = Course::query()->whereKey($data['course_id'])->where('is_active', true)->firstOrFail();
        if ($course->programme_id !== null && $student->programme_id !== null && (int) $course->programme_id !== (int) $student->programme_id) {
            throw ValidationException::withMessages([
                'course_id' => ['This course is not available for your programme.'],
            ]);
        }

        $existing = CourseRegistration::query()
            ->where('student_id', $student->id)
            ->where('course_id', $course->id)
            ->where('academic_year', $window->academic_year)
            ->where('term', $window->term)
            ->first();

        if ($existing && $existing->status === 'registered') {
            throw ValidationException::withMessages([
                'course_id' => ['You are already registered for this course.'],
            ]);
        }

        $currentCredits = CourseRegistration::query()
            ->where('student_id', $student->id)
            ->where('academic_year', $window->academic_year)
            ->where('term', $window->term)
            ->where('status', 'registered')
            ->with('course:id,credits')
            ->get()
            ->sum(fn (CourseRegistration $registration): int => (int) $registration->course->credits);

        if (($currentCredits + (int) $course->credits) > $window->max_credits) {
            throw ValidationException::withMessages([
                'course_id' => ["Registering this course would exceed the {$window->max_credits} credit limit."],
            ]);
        }

        $registration = DB::transaction(function () use ($existing, $student, $course, $window): CourseRegistration {
            if ($existing) {
                $existing->update(['status' => 'registered']);

                return $existing->fresh()->load('course.lecturer:id,name');
            }

            return CourseRegistration::query()->create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'academic_year' => $window->academic_year,
                'term' => $window->term,
                'status' => 'registered',
            ])->load('course.lecturer:id,name');
        });

        return response()->json([
            'message' => 'Course registered successfully.',
            'registration' => $registration,
        ], 201);
    }

    public function dropCourse(Request $request, CourseRegistration $registration): JsonResponse
    {
        $student = $this->student($request);
        abort_unless((int) $registration->student_id === (int) $student->id, 403, 'You can only drop your own courses.');

        $window = RegistrationWindow::current();
        if ($window === null || ! $window->isOpen()) {
            throw ValidationException::withMessages([
                'registration' => ['Course withdrawal is not open at this time.'],
            ]);
        }

        if ($registration->academic_year !== $window->academic_year || $registration->term !== $window->term) {
            throw ValidationException::withMessages([
                'registration' => ['You can only withdraw courses for the current registration period.'],
            ]);
        }

        if ($registration->status !== 'registered') {
            throw ValidationException::withMessages([
                'registration' => ['This registration cannot be withdrawn.'],
            ]);
        }

        $registration->update(['status' => 'withdrawn']);

        return response()->json([
            'message' => 'Course withdrawn successfully.',
            'registration' => $registration->fresh()->load('course:id,code,title,credits'),
        ]);
    }

    public function announcements(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $announcements = Announcement::query()
            ->publishedForStudents()
            ->with('author:id,name')
            ->withExists(['readers as is_read' => fn ($query) => $query->where('users.id', $userId)])
            ->latest('published_at')
            ->get()
            ->map(fn (Announcement $announcement): array => [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'body' => $announcement->body,
                'category' => $announcement->category,
                'published_at' => $announcement->published_at,
                'author' => $announcement->author?->only('id', 'name'),
                'is_read' => (bool) $announcement->is_read,
            ]);

        return response()->json(['announcements' => $announcements]);
    }

    public function markAnnouncementRead(Request $request, Announcement $announcement): JsonResponse
    {
        abort_unless(
            in_array($announcement->audience, ['students', 'all'], true)
            && $announcement->published_at !== null
            && $announcement->published_at->lessThanOrEqualTo(now()),
            404
        );

        $announcement->readers()->syncWithoutDetaching([
            $request->user()->id => ['read_at' => now()],
        ]);

        return response()->json(['message' => 'Announcement marked as read.']);
    }

    public function serviceRequests(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $requests = StudentServiceRequest::query()
            ->where('student_id', $student->id)
            ->latest()
            ->get();

        return response()->json(['requests' => $requests]);
    }

    public function createServiceRequest(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $data = $request->validate([
            'request_type' => ['required', Rule::in([
                'transcript', 'status_letter', 'enrolment_letter', 'other',
            ])],
            'details' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $serviceRequest = StudentServiceRequest::query()->create([
            'student_id' => $student->id,
            'reference' => 'SSR-'.strtoupper(Str::random(8)),
            'request_type' => $data['request_type'],
            'details' => $data['details'],
            'status' => 'submitted',
        ]);

        return response()->json([
            'message' => 'Your request has been submitted.',
            'request' => $serviceRequest,
        ], 201);
    }

    private function student(Request $request): Student
    {
        return $request->user()->student()->firstOrFail();
    }
}
