<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->string('emergency_contact_name')->nullable()->after('address');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            $table->string('profile_photo_path')->nullable()->after('emergency_contact_phone');
        });

        Schema::create('announcements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->text('body');
            $table->string('audience', 40)->default('students')->index();
            $table->string('category', 60)->default('general')->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('announcement_reads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('read_at');
            $table->unique(['announcement_id', 'user_id']);
        });

        Schema::create('student_service_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('reference', 40)->unique();
            $table->string('request_type', 60);
            $table->text('details');
            $table->string('status', 30)->default('submitted')->index();
            $table->text('staff_notes')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['student_id', 'status']);
        });

        Schema::create('registration_windows', function (Blueprint $table): void {
            $table->id();
            $table->string('academic_year', 20);
            $table->string('term', 100);
            $table->timestamp('opens_at');
            $table->timestamp('closes_at');
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedTinyInteger('max_credits')->default(21);
            $table->timestamps();
            $table->unique(['academic_year', 'term']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_windows');
        Schema::dropIfExists('student_service_requests');
        Schema::dropIfExists('announcement_reads');
        Schema::dropIfExists('announcements');

        Schema::table('students', function (Blueprint $table): void {
            $table->dropColumn([
                'emergency_contact_name',
                'emergency_contact_phone',
                'profile_photo_path',
            ]);
        });
    }
};
