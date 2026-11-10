<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseMaterial extends Model
{
    protected $fillable = [
        'course_id', 'uploaded_by', 'title', 'description', 'original_name', 'disk', 'path', 'mime_type', 'size',
    ];

    protected $hidden = ['disk', 'path'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
