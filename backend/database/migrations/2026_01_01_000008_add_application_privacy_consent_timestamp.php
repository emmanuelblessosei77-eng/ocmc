<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('applications', 'privacy_consented_at')) {
            Schema::table('applications', function (Blueprint $table): void {
                $table->timestamp('privacy_consented_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('applications', 'privacy_consented_at')) {
            Schema::table('applications', function (Blueprint $table): void {
                $table->dropColumn('privacy_consented_at');
            });
        }
    }
};
