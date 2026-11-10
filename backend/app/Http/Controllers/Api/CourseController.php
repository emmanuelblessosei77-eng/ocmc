<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'programme_id' => ['sometimes', 'integer', 'exists:programmes,id'],
        ]);

        $query = Course::query()
            ->with(['programme:id,name', 'lecturer:id,name', 'sessions'])
            ->withCount(['registrations as registered_students_count' => fn ($registration) => $registration->where('status', 'registered')])
            ->orderBy('code');

        if (isset($filters['search'])) {
            $needle = '%'.mb_strtolower($filters['search']).'%';
            $query->where(fn ($courses) => $courses
                ->whereRaw('LOWER(code) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(title) LIKE ?', [$needle]));
        }
        if (isset($filters['status'])) {
            $query->where('is_active', $filters['status'] === 'active');
        }
        if (isset($filters['programme_id'])) {
            $query->where('programme_id', $filters['programme_id']);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $sessions = $data['sessions'] ?? [];
        unset($data['sessions']);

        $course = DB::transaction(function () use ($data, $sessions): Course {
            $course = Course::query()->create($data);
            $course->sessions()->createMany($sessions);

            return $course;
        });

        return response()->json($this->payload($course), 201);
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $data = $this->validated($request, $course);
        $sessions = $data['sessions'] ?? null;
        unset($data['sessions']);

        DB::transaction(function () use ($course, $data, $sessions): void {
            $course->update($data);
            if ($sessions !== null) {
                $course->sessions()->delete();
                $course->sessions()->createMany($sessions);
            }
        });

        return response()->json($this->payload($course->refresh()));
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->update(['is_active' => false]);

        return response()->json(['message' => 'Course archived.']);
    }

    private function validated(Request $request, ?Course $course = null): array
    {
        $codeRule = Rule::unique('courses', 'code');
        if ($course !== null) {
            $codeRule->ignore($course->id);
        }

        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', $codeRule],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'programme_id' => ['nullable', 'integer', 'exists:programmes,id'],
            'lecturer_id' => ['nullable', 'integer', 'exists:users,id'],
            'credits' => ['required', 'integer', 'between:1,30'],
            'is_active' => ['sometimes', 'boolean'],
            'sessions' => ['sometimes', 'array', 'max:20'],
            'sessions.*.day_of_week' => ['required_with:sessions', 'integer', 'between:0,6'],
            'sessions.*.starts_at' => ['required_with:sessions', 'date_format:H:i'],
            'sessions.*.ends_at' => ['required_with:sessions', 'date_format:H:i', 'after:sessions.*.starts_at'],
            'sessions.*.room' => ['nullable', 'string', 'max:100'],
            'sessions.*.term' => ['required_with:sessions', 'string', 'max:100'],
            'sessions.*.academic_year' => ['required_with:sessions', 'string', 'max:20'],
        ]);

        if (! empty($data['lecturer_id'])) {
            $lecturer = User::query()->findOrFail($data['lecturer_id']);
            abort_unless(
                $lecturer->hasRole('Lecturer') || $lecturer->hasRole('Super Administrator'),
                422,
                'Courses can only be assigned to lecturer accounts.'
            );
        }

        return $data;
    }

    private function payload(Course $course): array
    {
        return $course->load(['programme:id,name', 'lecturer:id,name', 'sessions'])
            ->loadCount(['registrations as registered_students_count' => fn ($registration) => $registration->where('status', 'registered')])
            ->toArray();
    }
}
