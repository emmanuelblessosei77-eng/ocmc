<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Course;
use App\Models\CourseRegistration;
use App\Models\Programme;
use App\Models\RegistrationWindow;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentSelfServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_student_can_update_own_profile_and_change_password(): void
    {
        [$user, $student] = $this->studentAccount();
        Sanctum::actingAs($user);

        $this->patchJson('/api/student/profile', [
            'phone' => '+233201234567',
            'address' => 'Accra, Ghana',
            'emergency_contact_name' => 'Ama Mensah',
            'emergency_contact_phone' => '+233209876543',
        ])
            ->assertOk()
            ->assertJsonPath('student.phone', '+233201234567')
            ->assertJsonPath('student.emergency_contact_name', 'Ama Mensah');

        $this->postJson('/api/auth/change-password', [
            'current_password' => 'Student-secure-password-2026!',
            'password' => 'New-secure-password-2026!',
            'password_confirmation' => 'New-secure-password-2026!',
        ])->assertOk();

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('New-secure-password-2026!', $user->fresh()->password)
        );
        $this->assertSame($student->id, $user->fresh()->student->id);
    }

    public function test_student_can_register_and_drop_courses_within_open_window(): void
    {
        [$user, $student] = $this->studentAccount();
        $programme = Programme::query()->firstOrFail();
        $student->update(['programme_id' => $programme->id]);

        RegistrationWindow::query()->create([
            'academic_year' => '2026/2027',
            'term' => 'First semester',
            'opens_at' => now()->subDay(),
            'closes_at' => now()->addMonth(),
            'is_active' => true,
            'max_credits' => 21,
        ]);

        $course = Course::query()->create([
            'programme_id' => $programme->id,
            'code' => 'COM101',
            'title' => 'Introduction to Communication',
            'credits' => 3,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);
        $this->postJson('/api/student/courses/register', ['course_id' => $course->id])
            ->assertCreated()
            ->assertJsonPath('registration.course_id', $course->id);

        $registration = CourseRegistration::query()->where('student_id', $student->id)->firstOrFail();

        $this->postJson('/api/student/courses/register', ['course_id' => $course->id])
            ->assertStatus(422);

        $this->postJson("/api/student/courses/registrations/{$registration->id}/drop")
            ->assertOk()
            ->assertJsonPath('registration.status', 'withdrawn');
    }

    public function test_student_cannot_access_another_students_registration(): void
    {
        [$user] = $this->studentAccount();
        $other = Student::factory()->create();
        $course = Course::query()->create([
            'code' => 'IT101',
            'title' => 'Computing Foundations',
            'credits' => 3,
            'is_active' => true,
        ]);
        $registration = CourseRegistration::query()->create([
            'student_id' => $other->id,
            'course_id' => $course->id,
            'academic_year' => '2026/2027',
            'term' => 'First semester',
            'status' => 'registered',
        ]);

        RegistrationWindow::query()->create([
            'academic_year' => '2026/2027',
            'term' => 'First semester',
            'opens_at' => now()->subDay(),
            'closes_at' => now()->addMonth(),
            'is_active' => true,
            'max_credits' => 21,
        ]);

        Sanctum::actingAs($user);
        $this->postJson("/api/student/courses/registrations/{$registration->id}/drop")
            ->assertForbidden();
    }

    public function test_student_can_read_announcements_and_submit_service_requests(): void
    {
        [$user] = $this->studentAccount();
        $admin = User::factory()->create();
        $announcement = Announcement::query()->create([
            'created_by' => $admin->id,
            'title' => 'Examination timetable published',
            'body' => 'Please check the examinations office notice board and your portal.',
            'audience' => 'students',
            'category' => 'examinations',
            'published_at' => now(),
        ]);

        Sanctum::actingAs($user);
        $this->getJson('/api/student/announcements')
            ->assertOk()
            ->assertJsonFragment(['title' => 'Examination timetable published']);

        $this->postJson("/api/student/announcements/{$announcement->id}/read")
            ->assertOk();

        $this->postJson('/api/student/service-requests', [
            'request_type' => 'transcript',
            'details' => 'I need an official transcript for postgraduate applications.',
        ])
            ->assertCreated()
            ->assertJsonPath('request.request_type', 'transcript');
    }

    public function test_unauthenticated_users_cannot_use_student_self_service(): void
    {
        $this->getJson('/api/student/profile')->assertUnauthorized();
        $this->postJson('/api/student/courses/register', ['course_id' => 1])->assertUnauthorized();
    }

    /**
     * @return array{0: User, 1: Student}
     */
    private function studentAccount(): array
    {
        $user = User::factory()->create([
            'password' => 'Student-secure-password-2026!',
        ]);
        $role = Role::query()->where('name', 'Student')->firstOrFail();
        $user->roles()->attach($role->id);
        $student = Student::factory()->create(['user_id' => $user->id]);

        return [$user, $student];
    }
}
