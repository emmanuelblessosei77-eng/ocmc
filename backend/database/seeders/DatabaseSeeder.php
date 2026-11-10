<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Permission;
use App\Models\Programme;
use App\Models\RegistrationWindow;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'programmes.manage' => 'Create, update and archive programmes.',
            'applications.view' => 'View all submitted applications.',
            'applications.manage' => 'Review, assign and update applications.',
            'applications.view-own' => 'View applications linked to the signed-in account.',
            'students.view' => 'View all student records.',
            'students.view-own' => 'View the signed-in student record.',
            'students.manage' => 'Update student records and create student profiles.',
            'staff.view' => 'View staff directory records.',
            'staff.manage' => 'Create and update staff directory records.',
            'roles.manage' => 'View roles and assign user roles.',
            'finance.view' => 'View finance tools.',
            'finance.manage' => 'Manage finance records.',
            'teaching.assignments.view' => 'View lecturer teaching tools.',
            'teaching.assignments.manage' => 'Manage attendance, materials and grade submissions for assigned courses.',
            'courses.manage' => 'Create, update and archive courses and assign lecturers.',
            'grades.manage' => 'Review and approve lecturer grade submissions.',
            'finance.view-own' => 'View fee statements for the signed-in student account.',
            'student.portal.view' => 'Access the student portal.',
            'alumni.portal.view' => 'Access the alumni portal.',
        ];

        foreach ($permissions as $name => $description) {
            Permission::query()->updateOrCreate(['name' => $name], ['description' => $description]);
        }

        $rolePermissions = [
            'Super Administrator' => array_keys($permissions),
            'Admissions Officer' => [
                'applications.view', 'applications.manage', 'students.view', 'programmes.manage',
            ],
            'Registrar' => [
                'applications.view', 'students.view', 'students.manage', 'staff.view',
                'courses.manage', 'grades.manage',
            ],
            'Finance Officer' => ['finance.view', 'finance.manage'],
            'Lecturer' => ['teaching.assignments.view', 'teaching.assignments.manage'],
            'Student' => ['student.portal.view', 'students.view-own', 'applications.view-own', 'finance.view-own'],
            'Alumni' => ['alumni.portal.view'],
        ];

        foreach ($rolePermissions as $roleName => $permissionNames) {
            $role = Role::query()->updateOrCreate(
                ['name' => $roleName],
                ['description' => $roleName.' access profile']
            );
            $role->permissions()->sync(
                Permission::query()->whereIn('name', $permissionNames)->pluck('id')
            );
        }

        $programmes = [
            ['Business Administration', 'bachelor-of-business-administration', 'Bachelor of Business Administration', 'Business', 'Build strategic, financial and people skills to lead organisations.'],
            ['Marketing & Communication', 'marketing-and-communication', 'Bachelor of Arts', 'Communication', 'Turn creative ideas into clear messages and meaningful brands.'],
            ['Information Technology', 'information-technology', 'Bachelor of Science', 'Technology', 'Explore software, networks and digital systems through practical learning.'],
            ['Human Resource Management', 'human-resource-management', 'Bachelor of Business Administration', 'Business', 'Build inclusive workplaces and help people and organisations thrive.'],
            ['Accounting & Finance', 'accounting-and-finance', 'Bachelor of Business Administration', 'Business', 'Develop practical financial expertise for a changing business landscape.'],
            ['General Arts', 'general-arts', 'Bachelor of Arts', 'Communication', 'Strengthen critical thinking, research and communication across disciplines.'],
        ];

        foreach ($programmes as [$name, $slug, $award, $category, $description]) {
            Programme::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'award' => $award,
                    'category' => $category,
                    'duration_years' => 4,
                    'description' => $description,
                    'entry_requirements' => 'Contact admissions for current entry requirements.',
                    'is_active' => true,
                ]
            );
        }

        $adminEmail = config('app.bootstrap_admin.email');
        $adminName = config('app.bootstrap_admin.name');
        $adminPassword = config('app.bootstrap_admin.password');

        if ($adminEmail !== null || $adminName !== null || $adminPassword !== null) {
            if (! is_string($adminEmail) || ! filter_var($adminEmail, FILTER_VALIDATE_EMAIL)
                || ! is_string($adminName) || trim($adminName) === ''
                || ! is_string($adminPassword) || strlen($adminPassword) < 12) {
                throw new \InvalidArgumentException(
                    'Set OCMC_ADMIN_NAME, a valid OCMC_ADMIN_EMAIL and an OCMC_ADMIN_PASSWORD of at least 12 characters together.'
                );
            }

            $admin = User::query()->firstOrCreate(
                ['email' => $adminEmail],
                [
                    'name' => $adminName,
                    'password' => Hash::make($adminPassword),
                    'email_verified_at' => now(),
                ]
            );
            $admin->roles()->syncWithoutDetaching([
                Role::query()->where('name', 'Super Administrator')->value('id'),
            ]);

            RegistrationWindow::query()->updateOrCreate(
                [
                    'academic_year' => '2026/2027',
                    'term' => 'First semester',
                ],
                [
                    'opens_at' => now()->subDays(7),
                    'closes_at' => now()->addMonths(2),
                    'is_active' => true,
                    'max_credits' => 21,
                ]
            );

            Announcement::query()->updateOrCreate(
                ['title' => 'Welcome to the OCMC student portal'],
                [
                    'created_by' => $admin->id,
                    'body' => 'Use the student portal to review your courses, timetable, attendance, approved results and fee statements. Contact the Registrar if any information appears incorrect.',
                    'audience' => 'students',
                    'category' => 'general',
                    'published_at' => now(),
                ]
            );
        }
    }
}
