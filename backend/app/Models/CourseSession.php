<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseSession extends Model
{
    protected $fillable = ['course_id', 'day_of_week', 'starts_at', 'ends_at', 'room', 'term', 'academic_year'];

    protected function casts(): array
    {
        return ['day_of_week' => 'integer'];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
