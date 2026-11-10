<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EnquiryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'interest' => ['required', Rule::in(['admissions', 'programmes', 'alumni', 'general'])],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        Enquiry::query()->create($data);

        return response()->json(['message' => 'Your enquiry has been sent.'], 201);
    }
}
