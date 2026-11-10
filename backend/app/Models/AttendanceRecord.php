<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = ['course_registration_id', 'marked_by', 'class_date', 'status', 'notes'];

    protected function casts(): array
    {
        return ['class_date' => 'date'];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(CourseRegistration::class, 'course_registration_id');
    }
}
