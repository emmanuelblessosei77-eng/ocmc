<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentAccountProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_registrar_can_create_student_account_and_student_sets_password_from_email_link(): void
    {
        Notification::fake();
        $registrar = $this->userWithRole('Registrar');
        Sanctum::actingAs($registrar);

        $response = $this->postJson('/api/manage/students/accounts', [
            'name' => 'Ama Mensah',
            'email' => 'ama.mensah@example.com',
            'student_number' => 'OCMC-2026-001',
        ])->assertCreated()
            ->assertJsonPath('invitation_sent', true)
            ->assertJsonMissingPath('student.user.password');

        $student = Student::query()->where('student_number', 'OCMC-2026-001')->firstOrFail();
        $user = $student->user;

        $this->assertSame('ama.mensah@example.com', $user->email);
        $this->assertTrue($user->hasRole('Student'));
        $this->assertNull($user->email_verified_at);
        $this->assertNotEmpty($response->json('student.user.id'));
        Notification::assertSentTo($user, ResetPassword::class);

        $resetToken = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$resetToken): bool {
                $resetToken = $notification->token;

                return true;
            }
        );

        $password = 'Student-secure-password-2026!';
        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $resetToken,
            'password' => $password,
            'password_confirmation' => $password,
        ])->assertOk();

        $this->assertTrue(Hash::check($password, $user->fresh()->password));
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => $password,
        ])->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_only_authorized_roles_can_create_or_resend_student_invitations(): void
    {
        $student = Student::factory()->create();

        foreach (['Admissions Officer', 'Lecturer'] as $roleName) {
            Sanctum::actingAs($this->userWithRole($roleName));

            $this->postJson('/api/manage/students/accounts', [
                'name' => 'Unauthorized User',
                'email' => strtolower(str_replace(' ', '.', $roleName)).'@example.com',
                'student_number' => 'UNAUTHORIZED-'.str_replace(' ', '-', strtoupper($roleName)),
            ])->assertForbidden();

            $this->postJson("/api/manage/students/{$student->id}/invitation")
                ->assertForbidden();
        }
    }

    public function test_registrar_can_resend_password_setup_link_for_an_existing_student(): void
    {
        Notification::fake();
        $registrar = $this->userWithRole('Registrar');
        $student = Student::factory()->create();
        Sanctum::actingAs($registrar);

        $this->postJson("/api/manage/students/{$student->id}/invitation")
            ->assertOk()
            ->assertJsonPath('invitation_sent', true);

        Notification::assertSentTo($student->user, ResetPassword::class);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::query()->where('name', $roleName)->value('id'));

        return $user;
    }
}
