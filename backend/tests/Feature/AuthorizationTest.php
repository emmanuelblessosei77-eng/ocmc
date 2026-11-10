<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Programme;
use App\Models\Role;
use App\Models\Staff;
use App\Models\Student;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_protected_endpoints_reject_guests(): void
    {
        $this->getJson('/api/manage/applications')->assertUnauthorized();
        $this->getJson('/api/students')->assertUnauthorized();
        $this->getJson('/api/manage/roles')->assertUnauthorized();
        $this->getJson('/api/applications/mine')->assertUnauthorized();
    }

    public function test_student_cannot_read_admissions_finance_or_staff_management_data(): void
    {
        $student = $this->userWithRole('Student');
        Sanctum::actingAs($student);

        $this->getJson('/api/manage/applications')->assertForbidden();
        $this->getJson('/api/finance/overview')->assertForbidden();
        $this->getJson('/api/manage/staff')->assertForbidden();
        $this->getJson('/api/manage/roles')->assertForbidden();
        $this->getJson('/api/manage/programmes')->assertForbidden();
        $this->postJson('/api/manage/staff/accounts', [])->assertForbidden();
        $this->postJson('/api/manage/users', [])->assertForbidden();
        $this->getJson('/api/alumni-portal')->assertForbidden();
        $studentRecord = Student::factory()->create();
        $this->patchJson('/api/manage/students/'.$studentRecord->id, ['status' => 'graduated'])->assertForbidden();
    }

    public function test_admissions_officer_can_review_applications_but_cannot_manage_roles(): void
    {
        Sanctum::actingAs($this->userWithRole('Admissions Officer'));

        $this->getJson('/api/manage/applications')->assertOk();
        $this->getJson('/api/manage/roles')->assertForbidden();
        $this->getJson('/api/finance/overview')->assertForbidden();
    }

    public function test_finance_officer_cannot_access_student_records_or_admissions(): void
    {
        Sanctum::actingAs($this->userWithRole('Finance Officer'));

        $this->getJson('/api/finance/overview')->assertOk();
        $this->getJson('/api/students')->assertForbidden();
        $this->getJson('/api/manage/applications')->assertForbidden();
    }

    public function test_student_record_lists_and_details_are_scoped_to_the_signed_in_user(): void
    {
        $studentUser = $this->userWithRole('Student');
        $own = Student::factory()->create(['user_id' => $studentUser->id]);
        $other = Student::factory()->create();
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);

        $this->getJson('/api/students/'.$own->id)->assertOk();
        $this->getJson('/api/students/'.$other->id)->assertForbidden();
    }

    public function test_students_can_only_view_applications_linked_to_their_account(): void
    {
        $studentUser = $this->userWithRole('Student');
        $own = Application::factory()->linkedTo($studentUser)->create();
        $other = Application::factory()->create();
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/applications/mine')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);

        $this->getJson('/api/applications/'.$own->id)->assertOk();
        $this->getJson('/api/applications/'.$other->id)->assertForbidden();
    }

    public function test_students_and_staff_can_sign_in_with_their_individual_ids(): void
    {
        $student = $this->userWithRole('Student');
        $student->forceFill(['password' => Hash::make('Student-password-123!')])->save();
        Student::factory()->create([
            'user_id' => $student->id,
            'student_number' => 'OCMC-STU-1042',
        ]);
        $this->postJson('/api/auth/login', [
            'identifier' => 'ocmc-stu-1042',
            'password' => 'Student-password-123!',
        ])->assertOk()->assertJsonPath('user.id', $student->id);

        $lecturer = $this->userWithRole('Lecturer');
        $lecturer->forceFill(['password' => Hash::make('Lecturer-password-123!')])->save();
        Staff::factory()->create([
            'user_id' => $lecturer->id,
            'employee_number' => 'OCMC-EMP-204',
        ]);
        $this->postJson('/api/auth/login', [
            'identifier' => 'ocmc-emp-204',
            'password' => 'Lecturer-password-123!',
        ])->assertOk()->assertJsonPath('user.id', $lecturer->id);
    }

    public function test_sign_in_rejects_an_id_that_matches_multiple_accounts(): void
    {
        $studentUser = $this->userWithRole('Student');
        Student::factory()->create([
            'user_id' => $studentUser->id,
            'student_number' => 'OCMC-DUP-1',
        ]);
        $staffUser = $this->userWithRole('Lecturer');
        Staff::factory()->create([
            'user_id' => $staffUser->id,
            'employee_number' => 'OCMC-DUP-1',
        ]);

        $this->postJson('/api/auth/login', [
            'identifier' => 'OCMC-DUP-1',
            'password' => 'password',
        ])->assertUnprocessable();
    }

    public function test_staff_account_creation_uses_allowed_role_and_sends_password_setup_link(): void
    {
        Notification::fake();
        Sanctum::actingAs($this->userWithRole('Super Administrator'));

        $response = $this->postJson('/api/manage/staff/accounts', [
            'name' => 'Ama Staff',
            'email' => 'ama.staff@example.com',
            'employee_number' => 'OCMC-STAFF-104',
            'role' => 'Lecturer',
            'department' => 'Academic Affairs',
            'job_title' => 'Lecturer',
        ])->assertCreated()
            ->assertJsonPath('staff.employee_number', 'OCMC-STAFF-104')
            ->assertJsonPath('invitation_sent', true);

        $createdUser = User::query()->where('email', 'ama.staff@example.com')->firstOrFail();
        $this->assertTrue($createdUser->hasRole('Lecturer'));
        Notification::assertSentTo($createdUser, ResetPassword::class);

        $this->postJson('/api/manage/staff/accounts', [
            'name' => 'Unauthorized Admin',
            'email' => 'unauthorized.admin@example.com',
            'employee_number' => 'OCMC-STAFF-105',
            'role' => 'Super Administrator',
        ])->assertUnprocessable();
    }

    public function test_super_administrator_can_manage_roles(): void
    {
        $admin = $this->userWithRole('Super Administrator');
        $target = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->getJson('/api/manage/roles')->assertOk();
        $this->putJson('/api/manage/users/'.$target->id.'/roles', [
            'roles' => [Role::query()->where('name', 'Lecturer')->value('id')],
        ])->assertOk();

        $this->assertTrue($target->fresh()->hasRole('Lecturer'));
    }

    public function test_super_administrator_can_provision_a_user_with_a_role(): void
    {
        Sanctum::actingAs($this->userWithRole('Super Administrator'));
        $studentRole = Role::query()->where('name', 'Student')->value('id');

        $response = $this->postJson('/api/manage/users', [
            'name' => 'New Student',
            'email' => 'new.student@example.com',
            'password' => 'Unique-strong-password-123!',
            'password_confirmation' => 'Unique-strong-password-123!',
            'roles' => [$studentRole],
        ])->assertCreated();

        $this->assertTrue(
            User::query()->findOrFail($response->json('id'))->hasRole('Student')
        );
        $this->assertDatabaseMissing('users', [
            'email' => 'new.student@example.com',
            'password' => 'Unique-strong-password-123!',
        ]);
    }

    public function test_application_draft_is_private_and_client_cannot_set_review_fields(): void
    {
        $programme = Programme::factory()->create();

        $response = $this->postJson('/api/applications/drafts', [
            'programme_id' => $programme->id,
            'applicant_name' => 'Applicant Example',
            'email' => 'applicant@example.com',
            'phone' => '+233200000001',
            'status' => 'accepted',
            'review_notes' => 'Approved',
        ])->assertCreated()->assertJsonStructure(['application' => ['reference', 'status'], 'access_key']);

        $this->assertDatabaseHas('applications', [
            'email' => 'applicant@example.com',
            'status' => 'draft',
            'review_notes' => null,
        ]);

        $reference = $response->json('application.reference');
        $id = $response->json('application.id');
        $this->getJson('/api/applications/'.$id.'/status')->assertNotFound();
        $this->withToken($response->json('access_key'))
            ->getJson('/api/applications/'.$id.'/status')
            ->assertOk()
            ->assertJsonPath('reference', $reference);
    }

    public function test_public_contact_enquiry_is_saved(): void
    {
        $this->postJson('/api/enquiries', [
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'email' => 'ama@example.com',
            'interest' => 'admissions',
            'message' => 'Please send me admissions information.',
        ])->assertCreated();

        $this->assertDatabaseHas('enquiries', [
            'email' => 'ama@example.com',
            'interest' => 'admissions',
        ]);
    }

    public function test_password_reset_changes_password_and_revokes_existing_tokens(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $user->createToken('old device');

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();

        $resetToken = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$resetToken): bool {
                $resetToken = $notification->token;

                return true;
            }
        );
        $mail = (new ResetPassword($resetToken))->toMail($user);
        $this->assertStringContainsString('/reset-password/'.$resetToken, $mail->actionUrl);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $resetToken,
            'password' => 'New-secure-password-123!',
            'password_confirmation' => 'New-secure-password-123!',
        ])->assertOk();

        $this->assertTrue(Hash::check('New-secure-password-123!', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    private function userWithRole(string $name): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::query()->where('name', $name)->value('id'));

        return $user;
    }
}
