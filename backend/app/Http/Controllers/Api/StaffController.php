<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);
        $query = Staff::query()->with('user:id,name,email');
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['search'])) {
            $needle = '%'.mb_strtolower($filters['search']).'%';
            $query->where(function ($staff) use ($needle): void {
                $staff->whereRaw('LOWER(employee_number) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(department) LIKE ?', [$needle])
                    ->orWhereRaw('LOWER(job_title) LIKE ?', [$needle])
                    ->orWhereHas('user', fn ($user) => $user
                        ->whereRaw('LOWER(name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$needle]));
            });
        }

        return response()->json($query->orderBy('employee_number')->paginate(20)->withQueryString());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id', 'unique:staff,user_id'],
            'employee_number' => ['required', 'string', 'max:50', 'unique:staff,employee_number'],
            'department' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'started_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        return response()->json(Staff::query()->create($data), 201);
    }

    public function createAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'employee_number' => ['required', 'string', 'max:50', 'unique:staff,employee_number'],
            'role' => ['required', Rule::in(['Admissions Officer', 'Registrar', 'Finance Officer', 'Lecturer'])],
            'department' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
        ]);

        $role = Role::query()->where('name', $data['role'])->firstOrFail();
        $staff = DB::transaction(function () use ($data, $role): Staff {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make(Str::random(64)),
                'email_verified_at' => now(),
            ]);
            $user->roles()->attach($role->id);

            return $user->staff()->create([
                'employee_number' => $data['employee_number'],
                'department' => $data['department'] ?? null,
                'job_title' => $data['job_title'] ?? null,
            ]);
        });

        $status = Password::sendResetLink(['email' => $staff->user->email]);
        $invitationSent = $status === Password::RESET_LINK_SENT;

        return response()->json([
            'staff' => $staff->load('user:id,name,email'),
            'invitation_sent' => $invitationSent,
            'message' => $invitationSent
                ? 'Staff account created. A secure password setup link was sent to '.$staff->user->email.'.'
                : 'Staff account created, but the password setup email could not be sent. Configure mail delivery and resend password reset instructions.',
        ], 201);
    }

    public function update(Request $request, Staff $staff): JsonResponse
    {
        $data = $request->validate([
            'employee_number' => ['sometimes', 'string', 'max:50', 'unique:staff,employee_number,'.$staff->id],
            'department' => ['sometimes', 'nullable', 'string', 'max:255'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'started_at' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);
        $staff->update($data);

        return response()->json($staff->refresh()->load('user:id,name,email'));
    }
}
