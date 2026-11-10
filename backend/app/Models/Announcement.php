<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Announcement extends Model
{
    protected $fillable = [
        'created_by', 'title', 'body', 'audience', 'category', 'published_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function readers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_reads')
            ->withPivot('read_at');
    }

    public function scopePublishedForStudents($query)
    {
        return $query
            ->whereIn('audience', ['students', 'all'])
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->where(fn ($builder) => $builder
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>', now()));
    }
}
