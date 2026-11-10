<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->string('access_token_hash')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('address')->nullable();
            $table->text('previous_education')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->json('requested_document_types')->nullable();
            $table->index('access_token_hash');
        });

        Schema::create('application_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type', 60);
            $table->string('original_name');
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->index(['application_id', 'document_type']);
        });

        Schema::create('application_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 60);
            $table->string('from_status', 60)->nullable();
            $table->string('to_status', 60)->nullable();
            $table->text('message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_events');
        Schema::dropIfExists('application_documents');

        Schema::table('applications', function (Blueprint $table): void {
            $table->dropIndex(['access_token_hash']);
            $table->dropColumn([
                'access_token_hash', 'date_of_birth', 'nationality', 'address',
                'previous_education', 'submitted_at', 'requested_document_types',
            ]);
        });
    }
};
