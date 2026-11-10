<?php

namespace App\Http\Middleware;

use App\Models\Application;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApplicationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $application = $request->route('application');
        if (! $application instanceof Application) {
            $application = Application::query()->findOrFail($application);
        }

        $user = $request->user();
        if ($user !== null && $user->hasPermissionTo('applications.view')) {
            $request->attributes->set('application', $application);

            return $next($request);
        }

        $token = $request->bearerToken();
        abort_unless(
            is_string($token)
                && $application->access_token_hash !== null
                && Hash::check($token, $application->access_token_hash),
            404,
            'Application not found.'
        );

        $request->attributes->set('application', $application);

        return $next($request);
    }
}
