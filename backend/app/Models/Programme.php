<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Programme extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'award', 'category', 'duration_years',
        'description', 'entry_requirements', 'is_active',
    ];

    protected function casts(): array
    {
        return ['duration_years' => 'integer', 'is_active' => 'boolean'];
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
}
