<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'identifier' => ['required_without:email', 'string', 'max:255'],
            'email' => ['required_without:identifier', 'nullable', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $identifier = mb_strtolower(trim($credentials['identifier'] ?? $credentials['email']));
        $matches = User::query()
            ->where(fn ($query) => $query
                ->whereRaw('LOWER(email) = ?', [$identifier])
                ->orWhereHas('student', fn ($student) => $student
                    ->whereRaw('LOWER(student_number) = ?', [$identifier]))
                ->orWhereHas('staff', fn ($staff) => $staff
                    ->whereRaw('LOWER(employee_number) = ?', [$identifier])))
            ->limit(2)
            ->get();
        $user = $matches->count() === 1 ? $matches->first() : null;

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken($credentials['device_name'] ?? 'api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('roles.permissions:id,name')->only('id', 'name', 'email', 'roles'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->load('roles.permissions:id,name')->only('id', 'name', 'email', 'roles')
        );
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
            'remember_token' => Str::random(60),
        ])->save();

        $user->tokens()
            ->where('id', '!=', $user->currentAccessToken()?->id)
            ->delete();

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'If an account exists for that email, password reset instructions have been sent.',
        ]);
    }

    public function resetPassword(Request $request): Response
    {
        $credentials = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);

        $status = Password::reset($credentials, function (User $user, string $password): void {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();

            $user->tokens()->delete();
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            if (! $request->expectsJson()) {
                return back()
                    ->withErrors(['email' => 'The password reset link is invalid or expired.'])
                    ->withInput($request->only('email'));
            }

            return response()->json(['message' => 'The password reset link is invalid or expired.'], 422);
        }

        if (! $request->expectsJson()) {
            return response()->view('auth.password-reset-complete');
        }

        return response()->json(['message' => 'Password reset successfully.']);
    }
}
