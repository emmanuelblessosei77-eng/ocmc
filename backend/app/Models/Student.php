<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'programme_id', 'student_number', 'date_of_birth',
        'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone',
        'profile_photo_path', 'status', 'enrolled_at',
    ];

    protected $hidden = [
        'profile_photo_path',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date', 'enrolled_at' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function courseRegistrations(): HasMany
    {
        return $this->hasMany(CourseRegistration::class);
    }

    public function feeStatements(): HasMany
    {
        return $this->hasMany(FeeStatement::class);
    }
}
