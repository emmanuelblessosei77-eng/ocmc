<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Programme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgrammeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Programme::query()->where('is_active', true)->orderBy('name')->paginate(20)
        );
    }

    public function show(Programme $programme): JsonResponse
    {
        abort_unless($programme->is_active, 404);

        return response()->json($programme);
    }

    public function manageIndex(): JsonResponse
    {
        return response()->json(Programme::query()->orderBy('name')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $programme = Programme::query()->create($data);

        return response()->json($programme, 201);
    }

    public function update(Request $request, Programme $programme): JsonResponse
    {
        $programme->update($this->validated($request, $programme));

        return response()->json($programme->refresh());
    }

    public function destroy(Programme $programme): JsonResponse
    {
        $programme->update(['is_active' => false]);

        return response()->json(['message' => 'Programme archived.']);
    }

    private function validated(Request $request, ?Programme $programme = null): array
    {
        $uniqueSlug = 'unique:programmes,slug';
        if ($programme !== null) {
            $uniqueSlug .= ','.$programme->id;
        }

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'alpha_dash', 'max:255', $uniqueSlug],
            'award' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'duration_years' => ['required', 'integer', 'between:1,10'],
            'description' => ['required', 'string', 'max:10000'],
            'entry_requirements' => ['nullable', 'string', 'max:10000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
