<?php

namespace Database\Factories;

use App\Models\Programme;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Student>
 */
class StudentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'programme_id' => Programme::factory(),
            'student_number' => 'OCMC-'.fake()->unique()->numerify('######'),
            'date_of_birth' => fake()->dateTimeBetween('-30 years', '-18 years')->format('Y-m-d'),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->address(),
            'status' => 'active',
            'enrolled_at' => fake()->date(),
        ];
    }
}
