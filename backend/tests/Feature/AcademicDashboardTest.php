<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Course;
use App\Models\CourseAssessment;
use App\Models\CourseMaterial;
use App\Models\CourseRegistration;
use App\Models\FeeStatement;
use App\Models\GradeSubmission;
use App\Models\Programme;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('local');
    }

    public function test_student_dashboard_only_returns_the_signed_in_students_academic_and_fee_data(): void
    {
        $studentUser = $this->userWithRole('Student');
        $student = Student::factory()->create(['user_id' => $studentUser->id]);
        $otherStudent = Student::factory()->create();
        $lecturer = $this->userWithRole('Lecturer');
        $course = $this->courseFor($lecturer);
        $ownRegistration = $this->register($student, $course);
        $otherRegistration = $this->register($otherStudent, $course);
        $completedCourse = $this->courseFor($lecturer);
        $completedRegistration = $this->register($student, $completedCourse, 'Second semester', 'completed');

        AttendanceRecord::query()->create([
            'course_registration_id' => $ownRegistration->id,
            'marked_by' => $lecturer->id,
            'class_date' => now()->toDateString(),
            'status' => 'present',
        ]);
        $assessment = CourseAssessment::query()->create([
            'course_id' => $course->id,
            'created_by' => $lecturer->id,
            'title' => 'Mid-term assessment',
            'max_score' => 100,
        ]);
        $ownResult = $this->grade($assessment, $ownRegistration, $lecturer, 'approved');
        $otherResult = $this->grade($assessment, $otherRegistration, $lecturer, 'approved', 63);
        $completedAssessment = CourseAssessment::query()->create([
            'course_id' => $completedCourse->id,
            'created_by' => $lecturer->id,
            'title' => 'Completed course result',
            'max_score' => 100,
        ]);
        $this->grade($completedAssessment, $completedRegistration, $lecturer, 'approved', 91);
        $pendingAssessment = CourseAssessment::query()->create([
            'course_id' => $course->id,
            'created_by' => $lecturer->id,
            'title' => 'Pending assignment',
            'max_score' => 100,
        ]);
        $this->grade($pendingAssessment, $ownRegistration, $lecturer, 'submitted', 81);

        $ownFees = FeeStatement::query()->create([
            'student_id' => $student->id,
            'reference' => 'OCMC-FEE-OWN',
            'academic_year' => '2026/2027',
            'term' => 'First semester',
            'total_amount' => 1000,
            'amount_paid' => 250,
            'status' => 'partial',
        ]);
        FeeStatement::query()->create([
            'student_id' => $otherStudent->id,
            'reference' => 'OCMC-FEE-OTHER',
            'academic_year' => '2026/2027',
            'term' => 'First semester',
            'total_amount' => 9000,
            'amount_paid' => 0,
            'status' => 'unpaid',
        ]);
        $ownFees->items()->create(['description' => 'Tuition', 'amount' => 1000]);

        Sanctum::actingAs($studentUser);
        $this->getJson('/api/student-portal')
            ->assertOk()
            ->assertJsonPath('student.id', $student->id)
            ->assertJsonCount(2, 'registrations')
            ->assertJsonFragment(['id' => $ownRegistration->id])
            ->assertJsonCount(2, 'results')
            ->assertJsonFragment(['id' => $ownResult->id])
            ->assertJsonPath('fee_statements.0.reference', 'OCMC-FEE-OWN')
            ->assertJsonPath('statistics.registered_courses', 1)
            ->assertJsonPath('statistics.attendance_percentage', 100)
            ->assertJsonMissing(['reference' => 'OCMC-FEE-OTHER'])
            ->assertJsonMissingPath('registrations.2')
            ->assertJsonMissing(['score' => $otherResult->score]);
    }

    public function test_lecturer_can_manage_only_assigned_course_attendance_and_private_materials(): void
    {
        $lecturer = $this->userWithRole('Lecturer');
        $otherLecturer = $this->userWithRole('Lecturer');
        $student = Student::factory()->create();
        $student->user->roles()->attach(Role::query()->where('name', 'Student')->value('id'));
        $otherStudent = Student::factory()->create();
        $course = $this->courseFor($lecturer);
        $otherCourse = $this->courseFor($otherLecturer);
        $this->register($student, $course);
        $this->register($otherStudent, $otherCourse);
        Sanctum::actingAs($lecturer);

        $attendanceData = [
            'class_date' => now()->toDateString(),
            'attendance' => [['student_id' => $student->id, 'status' => 'present']],
        ];
        $this->postJson('/api/teaching/courses/'.$course->id.'/attendance', $attendanceData)
            ->assertOk()
            ->assertJsonPath('attendance.0.status', 'present');
        $this->postJson('/api/teaching/courses/'.$otherCourse->id.'/attendance', [
            ...$attendanceData,
            'attendance' => [['student_id' => $otherStudent->id, 'status' => 'absent']],
        ])->assertForbidden();
        $this->postJson('/api/teaching/courses/'.$course->id.'/attendance', [
            ...$attendanceData,
            'attendance' => [['student_id' => $otherStudent->id, 'status' => 'absent']],
        ])->assertNotFound();

        $this->post('/api/teaching/courses/'.$course->id.'/materials', [
            'title' => 'Week one lecture',
            'material' => UploadedFile::fake()->create('lecture.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonMissingPath('material.path')
            ->assertJsonMissingPath('material.disk');
        $material = CourseMaterial::query()->firstOrFail();
        $this->assertTrue(Storage::disk('local')->exists($material->path));

        Sanctum::actingAs($this->userWithRole('Student'));
        $this->get('/api/teaching/courses/'.$course->id.'/materials/'.$material->id)->assertForbidden();

        Sanctum::actingAs($student->user);
        $this->get('/api/teaching/courses/'.$course->id.'/materials/'.$material->id)->assertOk();
        $this->get('/api/teaching/courses/'.$otherCourse->id.'/materials/'.$material->id)->assertNotFound();
    }

    public function test_lecturer_submits_grades_for_review_before_student_can_see_results(): void
    {
        $lecturer = $this->userWithRole('Lecturer');
        $registrar = $this->userWithRole('Registrar');
        $student = Student::factory()->create();
        $student->user->roles()->attach(Role::query()->where('name', 'Student')->value('id'));
        $course = $this->courseFor($lecturer);
        $registration = $this->register($student, $course);
        $assessment = CourseAssessment::query()->create([
            'course_id' => $course->id,
            'created_by' => $lecturer->id,
            'title' => 'Final project',
            'max_score' => 100,
        ]);
        Sanctum::actingAs($lecturer);

        $submission = $this->postJson('/api/teaching/courses/'.$course->id.'/grades', [
            'assessment_id' => $assessment->id,
            'grades' => [['student_id' => $student->id, 'score' => 88]],
        ])->assertOk()->assertJsonPath('submissions.0.status', 'submitted');
        $submissionId = $submission->json('submissions.0.id');
        Sanctum::actingAs($student->user);
        $this->getJson('/api/student-portal')->assertOk()->assertJsonCount(0, 'results');
        $this->patchJson('/api/manage/grades/'.$submissionId, ['status' => 'approved'])->assertForbidden();

        Sanctum::actingAs($registrar);
        $this->getJson('/api/manage/grades/pending?search=Final')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $submissionId);
        $this->patchJson('/api/manage/grades/'.$submissionId, ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('status', 'approved');

        Sanctum::actingAs($student->user);
        $this->getJson('/api/student-portal')
            ->assertOk()
            ->assertJsonCount(1, 'results')
            ->assertJsonPath('results.0.score', '88.00');
    }

    public function test_administrators_can_search_and_manage_courses_but_lecturers_cannot(): void
    {
        $lecturer = $this->userWithRole('Lecturer');
        $this->courseFor($lecturer);
        Sanctum::actingAs($lecturer);
        $this->getJson('/api/manage/dashboard')->assertForbidden();
        $this->getJson('/api/manage/courses')->assertForbidden();
        $this->postJson('/api/manage/courses', [])->assertForbidden();

        Sanctum::actingAs($this->userWithRole('Registrar'));
        $this->getJson('/api/manage/courses?search=MEDIA')
            ->assertOk()
            ->assertJsonPath('total', 1);
        $this->postJson('/api/manage/courses', [
            'code' => 'ADM-210',
            'title' => 'Admissions Administration',
            'credits' => 3,
            'sessions' => [[
                'day_of_week' => 1,
                'starts_at' => '09:00',
                'ends_at' => '10:30',
                'room' => 'Room 2',
                'term' => 'First semester',
                'academic_year' => '2026/2027',
            ]],
        ])->assertCreated()
            ->assertJsonPath('code', 'ADM-210')
            ->assertJsonPath('sessions.0.day_of_week', 1)
            ->assertJsonPath('sessions.0.room', 'Room 2');
        $this->getJson('/api/manage/dashboard')
            ->assertOk()
            ->assertJsonPath('statistics.active_courses', 2);
    }

    public function test_administrator_dashboard_only_returns_statistics_the_role_can_view(): void
    {
        Sanctum::actingAs($this->userWithRole('Admissions Officer'));
        $this->getJson('/api/manage/dashboard')
            ->assertOk()
            ->assertJsonStructure(['statistics' => ['students', 'pending_applications', 'applications_by_status']])
            ->assertJsonMissingPath('statistics.staff')
            ->assertJsonMissingPath('statistics.active_courses');
    }

    private function courseFor(User $lecturer): Course
    {
        return Course::query()->create([
            'programme_id' => Programme::query()->firstOrFail()->id,
            'lecturer_id' => $lecturer->id,
            'code' => 'MEDIA-'.fake()->unique()->numerify('###'),
            'title' => 'Media production',
            'credits' => 3,
            'is_active' => true,
        ]);
    }

    private function register(
        Student $student,
        Course $course,
        string $term = 'First semester',
        string $status = 'registered'
    ): CourseRegistration {
        return CourseRegistration::query()->create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'academic_year' => '2026/2027',
            'term' => $term,
            'status' => $status,
        ]);
    }

    private function grade(
        CourseAssessment $assessment,
        CourseRegistration $registration,
        User $lecturer,
        string $status,
        int $score = 84
    ): GradeSubmission {
        return GradeSubmission::query()->create([
            'assessment_id' => $assessment->id,
            'course_registration_id' => $registration->id,
            'submitted_by' => $lecturer->id,
            'score' => $score,
            'status' => $status,
            'approved_by' => $status === 'approved' ? $lecturer->id : null,
            'approved_at' => $status === 'approved' ? now() : null,
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::query()->where('name', $roleName)->value('id'));

        return $user;
    }
}
