<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Staff>
 */
class StaffFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'employee_number' => 'OCMC-EMP-'.fake()->unique()->numerify('####'),
            'department' => fake()->randomElement(['Admissions', 'Registry', 'Finance', 'Academic Affairs']),
            'job_title' => fake()->jobTitle(),
            'started_at' => fake()->date(),
            'status' => 'active',
        ];
    }
}
