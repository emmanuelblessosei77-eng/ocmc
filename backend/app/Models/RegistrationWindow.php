<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationWindow extends Model
{
    protected $fillable = [
        'academic_year', 'term', 'opens_at', 'closes_at', 'is_active', 'max_credits',
    ];

    protected function casts(): array
    {
        return [
            'opens_at' => 'datetime',
            'closes_at' => 'datetime',
            'is_active' => 'boolean',
            'max_credits' => 'integer',
        ];
    }

    public function isOpen(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = now();

        return $now->greaterThanOrEqualTo($this->opens_at)
            && $now->lessThanOrEqualTo($this->closes_at);
    }

    public static function current(): ?self
    {
        return static::query()
            ->where('is_active', true)
            ->where('opens_at', '<=', now())
            ->where('closes_at', '>=', now())
            ->orderByDesc('opens_at')
            ->first();
    }
}
