<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationEvent;
use App\Models\Programme;
use App\Models\User;
use App\Notifications\ApplicationStatusChanged;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ApplicationController extends Controller
{
    private const DOCUMENT_TYPES = [
        'academic_transcript',
        'identity_document',
        'proof_of_results',
        'personal_statement',
        'other',
    ];

    public function createDraft(Request $request): JsonResponse
    {
        $data = $request->validate([
            'programme_id' => ['required', 'integer', Rule::exists('programmes', 'id')->where('is_active', true)],
            'applicant_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
        ]);

        $accessKey = Str::random(64);
        $reference = $this->newReference();
        $application = DB::transaction(function () use ($data, $accessKey, $reference): Application {
            $application = Application::query()->create([
                ...$data,
                'reference' => $reference,
                'status' => 'draft',
                'access_token_hash' => Hash::make($accessKey),
            ]);

            $application->events()->create([
                'event_type' => 'draft_created',
                'to_status' => 'draft',
                'message' => 'Your application draft was created.',
            ]);

            return $application;
        });

        return response()->json([
            'application' => $this->applicantPayload($application),
            'access_key' => $accessKey,
        ], 201);
    }

    public function updateDraft(Request $request): JsonResponse
    {
        /** @var Application $application */
        $application = $request->attributes->get('application');
        abort_unless($application->status === 'draft', 409, 'Only draft applications can be edited.');

        $data = $request->validate([
            'programme_id' => ['sometimes', 'required', 'integer', Rule::exists('programmes', 'id')->where('is_active', true)],
            'applicant_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:40'],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'nationality' => ['sometimes', 'nullable', 'string', 'max:100'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'previous_education' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'personal_statement' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);

        $application->update($data);
        $application->events()->create([
            'event_type' => 'draft_saved',
            'to_status' => 'draft',
            'message' => 'Your draft was saved.',
        ]);

        return response()->json(['application' => $this->applicantPayload($application->refresh())]);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        /** @var Application $application */
        $application = $request->attributes->get('application');
        abort_unless(
            in_array($application->status, ['draft', 'additional_documents_requested'], true),
            409,
            'Documents can only be uploaded while drafting or responding to a document request.'
        );

        $data = $request->validate([
            'document_type' => ['required', Rule::in(self::DOCUMENT_TYPES)],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        if ($application->status === 'additional_documents_requested') {
            abort_unless(
                in_array($data['document_type'], $application->requested_document_types ?? [], true),
                422,
                'This document type was not requested for this application.'
            );
        }

        $file = $data['document'];
        $path = $file->store('applications/'.$application->id, 'local');

        $document = $application->documents()->create([
            'uploaded_by' => $request->user()?->id,
            'document_type' => $data['document_type'],
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 240, ''),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize(),
        ]);

        $application->events()->create([
            'actor_id' => $request->user()?->id,
            'event_type' => 'document_uploaded',
            'to_status' => $application->status,
            'message' => 'A supporting document was added.',
            'metadata' => ['document_type' => $document->document_type],
        ]);

        if ($application->status === 'additional_documents_requested') {
            $requested = $application->requested_document_types ?? [];
            $uploadedTypes = $application->documents()->pluck('document_type')->all();
            $remaining = array_values(array_diff($requested, $uploadedTypes));

            if ($remaining === []) {
                $this->changeStatus(
                    $application,
                    'under_review',
                    $request->user(),
                    'The requested supporting documents have been received.',
                    'documents_received'
                );
            }
        }

        return response()->json([
            'message' => 'Supporting document uploaded securely.',
            'document' => $this->documentPayload($document),
        ], 201);
    }

    public function submit(Request $request): JsonResponse
    {
        /** @var Application $application */
        $application = $request->attributes->get('application');
        abort_unless($application->status === 'draft', 409, 'Only draft applications can be submitted.');

        $data = $request->validate([
            'applicant_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'programme_id' => ['required', 'integer', Rule::exists('programmes', 'id')->where('is_active', true)],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'nationality' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:255'],
            'previous_education' => ['required', 'string', 'max:10000'],
            'personal_statement' => ['required', 'string', 'min:50', 'max:10000'],
            'privacy_consent' => ['accepted'],
        ]);

        $documentTypes = $application->documents()->pluck('document_type')->unique()->all();
        $requiredDocuments = ['academic_transcript', 'identity_document'];
        $missingDocuments = array_values(array_diff($requiredDocuments, $documentTypes));

        if ($missingDocuments !== []) {
            return response()->json([
                'message' => 'Upload an academic transcript and identity document before submitting.',
                'missing_documents' => $missingDocuments,
            ], 422);
        }

        unset($data['privacy_consent']);
        $oldStatus = $application->status;
        $application->update([
            ...$data,
            'status' => 'submitted',
            'submitted_at' => now(),
            'privacy_consented_at' => now(),
        ]);
        $application->events()->create([
            'event_type' => 'submitted',
            'from_status' => $oldStatus,
            'to_status' => 'submitted',
            'message' => 'Your application was submitted successfully.',
        ]);
        $this->notifyApplicant($application, 'submitted', 'Your application was submitted successfully.');

        return response()->json([
            'message' => 'Application submitted successfully.',
            'application' => $this->applicantPayload($application->refresh()),
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        /** @var Application $application */
        $application = $request->attributes->get('application');

        return response()->json($this->applicantPayload($application));
    }

    public function track(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:32'],
            'access_key' => ['required', 'string', 'max:100'],
        ]);
        $application = Application::query()->where('reference', $data['reference'])->firstOrFail();
        abort_unless(Hash::check($data['access_key'], $application->access_token_hash ?? ''), 404);

        return response()->json($this->applicantPayload($application));
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in([
                'draft', 'submitted', 'under_review', 'additional_documents_requested', 'accepted', 'rejected',
            ])],
            'search' => ['sometimes', 'string', 'max:100'],
        ]);

        $query = Application::query()
            ->with(['programme:id,name,slug', 'assignedOfficer:id,name', 'documents', 'events'])
            ->latest();

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['search'])) {
            $search = $filters['search'];
            $needle = '%'.mb_strtolower($search).'%';
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(reference) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(applicant_name) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(email) LIKE ?', [$needle]));
        }

        $applications = $query->paginate(20);
        $applications->through(fn (Application $application): array => $this->staffPayload($application));

        return response()->json($applications);
    }

    public function review(Request $request, Application $application): JsonResponse
    {
        abort_unless(in_array($application->status, [
            'submitted', 'under_review', 'additional_documents_requested',
        ], true), 409, 'This application has already reached a final decision.');

        $data = $request->validate([
            'status' => ['required', Rule::in([
                'under_review', 'additional_documents_requested', 'accepted', 'rejected',
            ])],
            'review_notes' => ['nullable', 'string', 'max:10000'],
            'applicant_message' => ['required', 'string', 'max:2000'],
            'requested_document_types' => [
                Rule::requiredIf($request->input('status') === 'additional_documents_requested'),
                'array',
                'min:1',
            ],
            'requested_document_types.*' => ['required', 'distinct', Rule::in(self::DOCUMENT_TYPES)],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        if (isset($data['assigned_to']) && $data['assigned_to'] !== null) {
            $assignee = User::query()->findOrFail($data['assigned_to']);
            abort_unless(
                $assignee->hasRole('Admissions Officer') || $assignee->hasRole('Super Administrator'),
                422,
                'Applications may only be assigned to admissions officers.'
            );
        }

        $oldStatus = $application->status;
        $newStatus = $data['status'];
        $application->update([
            'status' => $newStatus,
            'review_notes' => $data['review_notes'] ?? $application->review_notes,
            'assigned_to' => $data['assigned_to'] ?? $application->assigned_to,
            'requested_document_types' => $newStatus === 'additional_documents_requested'
                ? $data['requested_document_types']
                : null,
        ]);
        $application->events()->create([
            'actor_id' => $request->user()->id,
            'event_type' => $newStatus,
            'from_status' => $oldStatus,
            'to_status' => $newStatus,
            'message' => $data['applicant_message'],
            'metadata' => $newStatus === 'additional_documents_requested'
                ? ['requested_document_types' => $data['requested_document_types']]
                : null,
        ]);
        $this->notifyApplicant($application, $newStatus, $data['applicant_message']);

        return response()->json($this->staffPayload($application->refresh()->load([
            'programme:id,name,slug,award', 'assignedOfficer:id,name', 'documents', 'events',
        ])));
    }

    public function downloadDocument(
        Request $request,
        Application $application,
        ApplicationDocument $document
    ): StreamedResponse {
        abort_unless($document->application_id === $application->id, 404);
        abort_unless(Storage::disk($document->disk)->exists($document->path), 404);

        return Storage::disk($document->disk)->download(
            $document->path,
            basename($document->original_name),
            ['Content-Type' => $document->mime_type, 'X-Content-Type-Options' => 'nosniff']
        );
    }

    public function mine(Request $request): JsonResponse
    {
        return response()->json(
            Application::query()
                ->with('programme:id,name,slug,award')
                ->where('user_id', $request->user()->id)
                ->latest()
                ->paginate(20)
        );
    }

    public function show(Request $request, Application $application): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user->hasPermissionTo('applications.view')
                || ($application->user_id !== null && $application->user_id === $user->id),
            403
        );

        return response()->json($application->load([
            'programme', 'assignedOfficer:id,name', 'documents', 'events',
        ]));
    }

    private function newReference(): string
    {
        do {
            $reference = 'OXCMC-'.now()->format('y').'-'.Str::upper(Str::random(8));
        } while (Application::query()->where('reference', $reference)->exists());

        return $reference;
    }

    private function applicantPayload(Application $application): array
    {
        $application->loadMissing(['programme:id,name,slug,award', 'documents', 'events']);

        return [
            'id' => $application->id,
            'reference' => $application->reference,
            'status' => $application->status,
            'applicant_name' => $application->applicant_name,
            'email' => $application->email,
            'phone' => $application->phone,
            'programme' => $application->programme,
            'date_of_birth' => $application->date_of_birth?->toDateString(),
            'nationality' => $application->nationality,
            'address' => $application->address,
            'previous_education' => $application->previous_education,
            'personal_statement' => $application->personal_statement,
            'submitted_at' => $application->submitted_at,
            'requested_document_types' => $application->requested_document_types ?? [],
            'documents' => $application->documents->map(fn (ApplicationDocument $document): array => $this->documentPayload($document)),
            'events' => $application->events
                ->whereNotNull('message')
                ->map(fn (ApplicationEvent $event): array => [
                    'event_type' => $event->event_type,
                    'from_status' => $event->from_status,
                    'to_status' => $event->to_status,
                    'message' => $event->message,
                    'created_at' => $event->created_at,
                ])->values(),
        ];
    }

    private function staffPayload(Application $application): array
    {
        return [
            ...$this->applicantPayload($application),
            'review_notes' => $application->review_notes,
            'assigned_officer' => $application->assignedOfficer?->only('id', 'name'),
        ];
    }

    private function documentPayload(ApplicationDocument $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'original_name' => $document->original_name,
            'mime_type' => $document->mime_type,
            'size' => $document->size,
            'created_at' => $document->created_at,
        ];
    }

    private function changeStatus(
        Application $application,
        string $newStatus,
        ?User $actor,
        string $message,
        string $eventType
    ): void {
        $oldStatus = $application->status;
        $application->update([
            'status' => $newStatus,
            'requested_document_types' => null,
        ]);
        $application->events()->create([
            'actor_id' => $actor?->id,
            'event_type' => $eventType,
            'from_status' => $oldStatus,
            'to_status' => $newStatus,
            'message' => $message,
        ]);
        $this->notifyApplicant($application, $newStatus, $message);
    }

    private function notifyApplicant(Application $application, string $status, string $message): void
    {
        Notification::route('mail', $application->email)
            ->notify(new ApplicationStatusChanged($application->reference, $status, $message));
    }
}
