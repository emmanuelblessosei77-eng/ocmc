<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeSubmission extends Model
{
    protected $fillable = [
        'assessment_id', 'course_registration_id', 'submitted_by', 'approved_by',
        'score', 'feedback', 'status', 'approved_at',
    ];

    protected function casts(): array
    {
        return ['score' => 'decimal:2', 'approved_at' => 'datetime'];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(CourseAssessment::class, 'assessment_id');
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(CourseRegistration::class, 'course_registration_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
