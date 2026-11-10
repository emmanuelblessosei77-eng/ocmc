<?php

namespace Database\Factories;

use App\Models\Programme;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<\App\Models\Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => 'OCMC-'.Str::upper(Str::random(10)),
            'user_id' => null,
            'programme_id' => Programme::factory(),
            'assigned_to' => null,
            'applicant_name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'personal_statement' => fake()->paragraph(),
            'status' => 'submitted',
            'review_notes' => null,
        ];
    }

    public function linkedTo(User $user): static
    {
        return $this->state(fn (): array => ['user_id' => $user->id, 'email' => $user->email]);
    }
}
