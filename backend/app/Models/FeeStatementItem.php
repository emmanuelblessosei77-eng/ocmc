<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeStatementItem extends Model
{
    protected $fillable = ['fee_statement_id', 'description', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function statement(): BelongsTo
    {
        return $this->belongsTo(FeeStatement::class, 'fee_statement_id');
    }
}
