<?php

use Illuminate\Support\Facades\Route;

Route::get('/reset-password/{token}', fn (string $token) => view('auth.password-reset', ['token' => $token]))
    ->name('password.reset');
Route::post('/reset-password', [App\Http\Controllers\Api\AuthController::class, 'resetPassword'])
    ->name('password.update')
    ->middleware('throttle:5,1');
