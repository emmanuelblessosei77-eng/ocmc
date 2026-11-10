<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeeStatement extends Model
{
    protected $fillable = [
        'student_id', 'reference', 'academic_year', 'term', 'total_amount',
        'amount_paid', 'due_at', 'status',
    ];

    protected function casts(): array
    {
        return ['total_amount' => 'decimal:2', 'amount_paid' => 'decimal:2', 'due_at' => 'date'];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(FeeStatementItem::class);
    }
}
