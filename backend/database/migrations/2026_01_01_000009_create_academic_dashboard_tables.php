<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('programme_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('lecturer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('code', 40)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('credits')->default(3);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->index(['programme_id', 'is_active']);
            $table->index(['lecturer_id', 'is_active']);
        });

        Schema::create('course_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->string('room', 100)->nullable();
            $table->string('term', 100);
            $table->string('academic_year', 20);
            $table->timestamps();
            $table->index(['course_id', 'academic_year', 'term']);
        });

        Schema::create('course_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->restrictOnDelete();
            $table->string('academic_year', 20);
            $table->string('term', 100);
            $table->string('status', 30)->default('registered')->index();
            $table->timestamps();
            $table->unique(['student_id', 'course_id', 'academic_year', 'term'], 'course_registration_unique');
            $table->index(['course_id', 'status']);
        });

        Schema::create('attendance_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_registration_id')->constrained()->cascadeOnDelete();
            $table->foreignId('marked_by')->constrained('users')->restrictOnDelete();
            $table->date('class_date');
            $table->string('status', 20);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['course_registration_id', 'class_date'], 'attendance_registration_date_unique');
            $table->index(['class_date', 'status']);
        });

        Schema::create('course_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('original_name');
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        Schema::create('course_assessments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->decimal('max_score', 7, 2);
            $table->timestamp('due_at')->nullable();
            $table->timestamps();
            $table->unique(['course_id', 'title']);
        });

        Schema::create('grade_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assessment_id')->constrained('course_assessments')->cascadeOnDelete();
            $table->foreignId('course_registration_id')->constrained()->cascadeOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('score', 7, 2);
            $table->text('feedback')->nullable();
            $table->string('status', 20)->default('submitted')->index();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['assessment_id', 'course_registration_id'], 'grade_assessment_registration_unique');
        });

        Schema::create('fee_statements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('reference', 50)->unique();
            $table->string('academic_year', 20);
            $table->string('term', 100);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->date('due_at')->nullable();
            $table->string('status', 20)->default('unpaid')->index();
            $table->timestamps();
            $table->index(['student_id', 'academic_year', 'term']);
        });

        Schema::create('fee_statement_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('fee_statement_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_statement_items');
        Schema::dropIfExists('fee_statements');
        Schema::dropIfExists('grade_submissions');
        Schema::dropIfExists('course_assessments');
        Schema::dropIfExists('course_materials');
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('course_registrations');
        Schema::dropIfExists('course_sessions');
        Schema::dropIfExists('courses');
    }
};
