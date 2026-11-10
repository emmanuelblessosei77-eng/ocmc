<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'leave', 'graduated', 'suspended'])],
        ]);
        $query = Student::query()->with(['user:id,name,email', 'programme:id,name,slug']);

        if (! $request->user()->hasPermissionTo('students.view')) {
            $query->where('user_id', $request->user()->id);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['search']) && $request->user()->hasPermissionTo('students.view')) {
            $needle = '%'.mb_strtolower($filters['search']).'%';
            $query->where(function ($students) use ($needle): void {
                $students->whereRaw('LOWER(student_number) LIKE ?', [$needle])
                    ->orWhereHas('user', fn ($user) => $user
                        ->whereRaw('LOWER(name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$needle]));
            });
        }

        return response()->json($query->orderBy('student_number')->paginate(20)->withQueryString());
    }

    public function show(Request $request, Student $student): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermissionTo('students.view')
                || $student->user_id === $request->user()->id,
            403
        );

        return response()->json($student->load(['user:id,name,email', 'programme']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id', 'unique:students,user_id'],
            'programme_id' => ['nullable', 'integer', 'exists:programmes,id'],
            'student_number' => ['required', 'string', 'max:50', 'unique:students,student_number'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,leave,graduated,suspended'],
            'enrolled_at' => ['nullable', 'date'],
        ]);

        $studentRole = Role::query()->where('name', 'Student')->firstOrFail();

        $student = DB::transaction(function () use ($data, $studentRole): Student {
            $student = Student::query()->create($data);
            $student->user->roles()->syncWithoutDetaching([$studentRole->id]);

            return $student;
        });

        return response()->json($student->load(['user:id,name,email', 'programme']), 201);
    }

    public function createAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'student_number' => ['required', 'string', 'max:50', 'unique:students,student_number'],
            'programme_id' => ['nullable', 'integer', 'exists:programmes,id'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

        $studentRole = Role::query()->where('name', 'Student')->firstOrFail();
        $student = DB::transaction(function () use ($data, $studentRole): Student {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make(Str::random(64)),
            ]);
            $user->roles()->attach($studentRole->id);
            unset($data['name'], $data['email']);

            return $user->student()->create($data);
        });

        return $this->sendStudentInvitation($student, 201);
    }

    public function resendInvitation(Student $student): JsonResponse
    {
        return $this->sendStudentInvitation($student);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'programme_id' => ['sometimes', 'nullable', 'integer', 'exists:programmes,id'],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,leave,graduated,suspended'],
        ]);

        $student->update($data);

        return response()->json($student->refresh()->load(['user:id,name,email', 'programme']));
    }

    private function sendStudentInvitation(Student $student, int $statusCode = 200): JsonResponse
    {
        $status = Password::sendResetLink(['email' => $student->user->email]);
        $sent = $status === Password::RESET_LINK_SENT;

        return response()->json([
            'student' => $student->load(['user:id,name,email', 'programme']),
            'invitation_sent' => $sent,
            'message' => $sent
                ? 'Student account created. Student ID: '.$student->student_number.'. A password setup link was sent to '.$student->user->email.'.'
                : 'Student account created with ID '.$student->student_number.', but the password setup email could not be sent. Configure mail delivery and retry the invitation.',
        ], $statusCode);
    }
}
