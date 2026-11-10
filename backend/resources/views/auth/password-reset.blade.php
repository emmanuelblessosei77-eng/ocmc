<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your password | OCMC Ghana</title>
    <style>
        body { background: #f8f6f0; color: #202b3a; font: 16px system-ui, sans-serif; margin: 0; }
        main { background: white; margin: 8vh auto; max-width: 440px; padding: 2rem; }
        h1 { color: #0a1931; font-family: Georgia, serif; font-size: 2rem; }
        label { display: block; font-size: .85rem; font-weight: 600; margin-top: 1rem; }
        input { border: 1px solid #cbd5e1; box-sizing: border-box; display: block; margin-top: .5rem; padding: .75rem; width: 100%; }
        button { background: #0a1931; border: 0; color: white; cursor: pointer; font-weight: 700; margin-top: 1.5rem; padding: .9rem 1.2rem; }
        .error { color: #9b1c1c; }
    </style>
</head>
<body>
<main>
    <p>OCMC Ghana · Student and staff accounts</p>
    <h1>Choose a new password.</h1>
    <p>Use a password with at least 12 characters. Existing sign-in tokens will be revoked.</p>
    @if ($errors->any())
        <p class="error" role="alert">{{ $errors->first() }}</p>
    @endif
    <form method="POST" action="{{ route('password.update') }}">
        @csrf
        <input type="hidden" name="token" value="{{ $token }}">
        <label for="email">Email address
            <input id="email" name="email" type="email" value="{{ old('email', request('email')) }}" autocomplete="email" required>
        </label>
        <label for="password">New password
            <input id="password" name="password" type="password" minlength="12" autocomplete="new-password" required>
        </label>
        <label for="password_confirmation">Confirm new password
            <input id="password_confirmation" name="password_confirmation" type="password" minlength="12" autocomplete="new-password" required>
        </label>
        <button type="submit">Reset password</button>
    </form>
</main>
</body>
</html>
