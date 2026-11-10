<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Role::query()->with('permissions:id,name,description')->orderBy('name')->get()
        );
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'integer', 'distinct', 'exists:roles,id'],
        ]);

        $user = DB::transaction(function () use ($data): User {
            $roleIds = $data['roles'];
            unset($data['roles']);
            $data['email_verified_at'] = now();
            $user = User::query()->create($data);
            $user->roles()->sync($roleIds);

            return $user;
        });

        return response()->json(
            $user->load('roles.permissions:id,name')->only('id', 'name', 'email', 'roles'),
            201
        );
    }

    public function assign(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 403, 'Administrators cannot change their own roles.');

        $data = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'integer', 'distinct', 'exists:roles,id'],
        ]);

        $user->roles()->sync($data['roles']);

        return response()->json($user->load('roles.permissions:id,name')->only('id', 'name', 'email', 'roles'));
    }
}
