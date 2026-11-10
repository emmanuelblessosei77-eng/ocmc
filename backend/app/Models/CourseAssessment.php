<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseAssessment extends Model
{
    protected $fillable = ['course_id', 'created_by', 'title', 'max_score', 'due_at'];

    protected function casts(): array
    {
        return ['max_score' => 'decimal:2', 'due_at' => 'datetime'];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(GradeSubmission::class, 'assessment_id');
    }
}
