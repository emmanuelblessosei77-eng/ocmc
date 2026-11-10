<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('ocmc:status', function (): void {
    $this->info('OCMC Ghana API is ready.');
})->purpose('Display OCMC API status');
