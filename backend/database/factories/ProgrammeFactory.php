<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<\App\Models\Programme>
 */
class ProgrammeFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name),
            'award' => 'Bachelor of Arts',
            'category' => fake()->randomElement(['Business', 'Communication', 'Technology']),
            'duration_years' => 4,
            'description' => fake()->paragraph(),
            'entry_requirements' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
