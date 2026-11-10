<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\Programme;
use App\Models\Role;
use App\Models\User;
use App\Notifications\ApplicationStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdmissionsWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('local');
    }

    public function test_applicant_can_create_resume_and_save_a_private_draft(): void
    {
        $draft = $this->createDraft();

        $this->assertStringStartsWith('OXCMC-'.now()->format('y').'-', $draft['application']['reference']);
        $this->assertDatabaseHas('applications', [
            'id' => $draft['application']['id'],
            'status' => 'draft',
        ]);
        $this->assertNotSame(
            $draft['access_key'],
            Application::query()->findOrFail($draft['application']['id'])->access_token_hash
        );

        $uri = '/api/applications/'.$draft['application']['id'];
        $this->getJson($uri.'/status')->assertNotFound();
        $this->withToken($draft['access_key'])->getJson($uri.'/status')
            ->assertOk()
            ->assertJsonPath('reference', $draft['application']['reference']);

        $this->withToken($draft['access_key'])->patchJson($uri.'/draft', [
            'date_of_birth' => '2004-06-12',
            'nationality' => 'Ghanaian',
            'address' => 'Accra',
            'previous_education' => 'Senior High School',
            'personal_statement' => 'I am interested in studying communication.',
        ])->assertOk()->assertJsonPath('application.nationality', 'Ghanaian');

        $this->assertDatabaseHas('applications', [
            'id' => $draft['application']['id'],
            'address' => 'Accra',
        ]);
    }

    public function test_submission_requires_completed_profile_consent_and_required_documents(): void
    {
        $draft = $this->createDraft();
        $uri = '/api/applications/'.$draft['application']['id'];

        $this->withToken($draft['access_key'])
            ->postJson($uri.'/submit', $this->submissionData())
            ->assertUnprocessable()
            ->assertJsonPath('missing_documents.0', 'academic_transcript');

        $this->upload($draft, 'academic_transcript');
        $this->upload($draft, 'identity_document');

        $this->withToken($draft['access_key'])
            ->postJson($uri.'/submit', $this->submissionData(['privacy_consent' => false]))
            ->assertUnprocessable();

        $notifications = Notification::fake();
        $this->withToken($draft['access_key'])
            ->postJson($uri.'/submit', $this->submissionData())
            ->assertOk()
            ->assertJsonPath('application.status', 'submitted');

        $this->assertDatabaseHas('applications', [
            'id' => $draft['application']['id'],
            'status' => 'submitted',
        ]);
        $notifications->assertSentOnDemand(ApplicationStatusChanged::class);
    }

    public function test_supporting_documents_are_private_and_reject_unsupported_files(): void
    {
        $draft = $this->createDraft();
        $uri = '/api/applications/'.$draft['application']['id'].'/documents';

        $this->withToken($draft['access_key'])->post($uri, [
            'document_type' => 'identity_document',
            'document' => UploadedFile::fake()->create('script.php', 10, 'application/x-php'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $uploaded = $this->upload($draft, 'identity_document');
        $documentId = $uploaded->json('document.id');
        $document = ApplicationDocument::query()->findOrFail($documentId);

        $this->assertTrue(Storage::disk('local')->exists($document->path));
        Storage::disk('public')->assertMissing($document->path);
        $this->assertStringContainsString('applications/'.$draft['application']['id'].'/', $document->path);
        $this->withHeaders(['Authorization' => 'Bearer invalid-access-key'])
            ->get('/api/applications/'.$draft['application']['id'].'/documents/'.$documentId.'/download')
            ->assertNotFound();
        $this->withToken($draft['access_key'])
            ->get('/api/applications/'.$draft['application']['id'].'/documents/'.$documentId.'/download')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $otherDraft = $this->createDraft();
        $this->withToken($otherDraft['access_key'])
            ->get('/api/applications/'.$otherDraft['application']['id'].'/documents/'.$documentId.'/download')
            ->assertNotFound();
    }

    public function test_admissions_staff_can_request_documents_and_applicant_can_complete_request(): void
    {
        $notifications = Notification::fake();
        $draft = $this->submittedApplication();
        $staff = $this->userWithRole('Admissions Officer');
        Sanctum::actingAs($staff);

        $this->patchJson('/api/manage/applications/'.$draft['application']['id'], [
            'status' => 'additional_documents_requested',
            'review_notes' => 'Internal note for admissions staff.',
            'applicant_message' => 'Please upload your proof of results.',
            'requested_document_types' => ['proof_of_results'],
        ])->assertOk()->assertJsonPath('status', 'additional_documents_requested');

        $notifications->assertSentOnDemand(ApplicationStatusChanged::class);

        Sanctum::actingAs($this->userWithRole('Lecturer'));
        $this->withHeaders(['Authorization' => 'Bearer invalid-access-key'])
            ->getJson('/api/applications/'.$draft['application']['id'].'/status')
            ->assertNotFound();

        Sanctum::actingAs($staff);
        $status = $this->withToken($draft['access_key'])
            ->getJson('/api/applications/'.$draft['application']['id'].'/status')
            ->assertOk()
            ->assertJsonPath('status', 'additional_documents_requested')
            ->assertJsonPath('requested_document_types.0', 'proof_of_results')
            ->assertJsonMissingPath('review_notes');

        $status->assertJsonFragment(['message' => 'Please upload your proof of results.']);

        $this->withToken($draft['access_key'])
            ->post('/api/applications/'.$draft['application']['id'].'/documents', [
                'document_type' => 'identity_document',
                'document' => UploadedFile::fake()->create('unrequested.pdf', 10, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        $this->upload($draft, 'proof_of_results');

        $this->withToken($draft['access_key'])
            ->getJson('/api/applications/'.$draft['application']['id'].'/status')
            ->assertOk()
            ->assertJsonPath('status', 'under_review')
            ->assertJsonPath('requested_document_types', []);

        Sanctum::actingAs($staff);
        $this->get('/api/manage/applications/'.$draft['application']['id'].'/documents/'.ApplicationDocument::query()
            ->where('application_id', $draft['application']['id'])
            ->where('document_type', 'proof_of_results')
            ->value('id').'/download')->assertOk();
    }

    public function test_staff_queue_filters_applications_without_exposing_private_file_paths(): void
    {
        $submitted = $this->submittedApplication();
        $draft = $this->createDraft();

        Application::query()->findOrFail($submitted['application']['id'])
            ->update(['applicant_name' => 'Kwame Searchable']);
        Application::query()->findOrFail($draft['application']['id'])
            ->update(['applicant_name' => 'Other Applicant']);

        Sanctum::actingAs($this->userWithRole('Admissions Officer'));
        $this->getJson('/api/manage/applications?status=submitted&search=Kwame')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.applicant_name', 'Kwame Searchable')
            ->assertJsonMissingPath('data.0.documents.0.path')
            ->assertJsonMissingPath('data.0.documents.0.disk')
            ->assertJsonMissingPath('data.0.access_token_hash');

        $this->getJson('/api/manage/applications?status=draft&search=Other')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.applicant_name', 'Other Applicant')
            ->assertJsonPath('data.0.status', 'draft');
    }

    public function test_staff_can_approve_or_reject_but_applicants_cannot_review_applications(): void
    {
        $accepted = $this->submittedApplication();
        $rejected = $this->submittedApplication();
        $notifications = Notification::fake();

        $this->withToken($accepted['access_key'])
            ->patchJson('/api/manage/applications/'.$accepted['application']['id'], [
                'status' => 'accepted',
                'applicant_message' => 'Congratulations. Your application has been accepted.',
            ])->assertUnauthorized();

        Sanctum::actingAs($this->userWithRole('Lecturer'));
        $this->patchJson('/api/manage/applications/'.$accepted['application']['id'], [
            'status' => 'accepted',
            'applicant_message' => 'Congratulations.',
        ])->assertForbidden();

        Sanctum::actingAs($this->userWithRole('Admissions Officer'));
        $this->patchJson('/api/manage/applications/'.$accepted['application']['id'], [
            'status' => 'accepted',
            'applicant_message' => 'Congratulations. Your application has been accepted.',
        ])->assertOk()->assertJsonPath('status', 'accepted');
        $this->patchJson('/api/manage/applications/'.$rejected['application']['id'], [
            'status' => 'rejected',
            'applicant_message' => 'We are unable to offer a place at this time.',
        ])->assertOk()->assertJsonPath('status', 'rejected');

        $this->assertDatabaseHas('applications', ['id' => $accepted['application']['id'], 'status' => 'accepted']);
        $this->assertDatabaseHas('applications', ['id' => $rejected['application']['id'], 'status' => 'rejected']);
        $this->assertDatabaseHas('application_events', [
            'application_id' => $accepted['application']['id'],
            'actor_id' => auth()->id(),
            'event_type' => 'accepted',
        ]);
        $notifications->assertSentOnDemandTimes(ApplicationStatusChanged::class, 2);
    }

    public function test_final_decision_cannot_be_reversed_by_staff(): void
    {
        $draft = $this->submittedApplication();
        Sanctum::actingAs($this->userWithRole('Admissions Officer'));

        $this->patchJson('/api/manage/applications/'.$draft['application']['id'], [
            'status' => 'accepted',
            'applicant_message' => 'Accepted.',
        ])->assertOk();

        $this->patchJson('/api/manage/applications/'.$draft['application']['id'], [
            'status' => 'rejected',
            'applicant_message' => 'Rejected.',
        ])->assertStatus(409);
    }

    private function createDraft(): array
    {
        $programme = Programme::query()->where('is_active', true)->firstOrFail();
        $response = $this->postJson('/api/applications/drafts', [
            'programme_id' => $programme->id,
            'applicant_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+233200000001',
        ])->assertCreated();

        return [
            'application' => $response->json('application'),
            'access_key' => $response->json('access_key'),
        ];
    }

    private function submittedApplication(): array
    {
        $draft = $this->createDraft();
        $this->upload($draft, 'academic_transcript');
        $this->upload($draft, 'identity_document');

        $this->withToken($draft['access_key'])
            ->postJson('/api/applications/'.$draft['application']['id'].'/submit', $this->submissionData())
            ->assertOk();

        return $draft;
    }

    private function upload(array $draft, string $documentType)
    {
        return $this->withToken($draft['access_key'])
            ->post('/api/applications/'.$draft['application']['id'].'/documents', [
                'document_type' => $documentType,
                'document' => UploadedFile::fake()->create($documentType.'.pdf', 50, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertCreated();
    }

    private function submissionData(array $overrides = []): array
    {
        return array_merge([
            'applicant_name' => 'Applicant Example',
            'email' => 'applicant@example.com',
            'phone' => '+233200000001',
            'programme_id' => Programme::query()->where('is_active', true)->value('id'),
            'date_of_birth' => '2004-06-12',
            'nationality' => 'Ghanaian',
            'address' => 'Accra, Ghana',
            'previous_education' => 'Senior High School, completed in 2024.',
            'personal_statement' => 'I am motivated to study at OXCMC because I want to build skills and contribute to my community.',
            'privacy_consent' => true,
        ], $overrides);
    }

    private function userWithRole(string $name): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::query()->where('name', $name)->value('id'));

        return $user;
    }
}
