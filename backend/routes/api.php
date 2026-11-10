<?php

use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\ProgrammeController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentSelfServiceController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:10,1');
    });
});

Route::get('/programmes', [ProgrammeController::class, 'index']);
Route::get('/programmes/{programme:slug}', [ProgrammeController::class, 'show']);
Route::post('/applications/drafts', [ApplicationController::class, 'createDraft'])->middleware('throttle:10,1');
Route::post('/applications/track', [ApplicationController::class, 'track'])->middleware('throttle:10,1');
Route::post('/enquiries', [EnquiryController::class, 'store'])->middleware('throttle:5,1');

Route::middleware(['application.access', 'throttle:60,1'])
    ->prefix('applications/{application}')
    ->group(function (): void {
        Route::get('/status', [ApplicationController::class, 'status']);
        Route::patch('/draft', [ApplicationController::class, 'updateDraft']);
        Route::post('/documents', [ApplicationController::class, 'uploadDocument']);
        Route::post('/submit', [ApplicationController::class, 'submit']);
        Route::get('/documents/{document}/download', [ApplicationController::class, 'downloadDocument']);
    });

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/applications/mine', [ApplicationController::class, 'mine'])
        ->middleware('permission:applications.view-own');
    Route::get('/applications/{application}', [ApplicationController::class, 'show'])
        ->middleware('permission:applications.view|applications.view-own');

    Route::get('/students', [StudentController::class, 'index'])
        ->middleware('permission:students.view|students.view-own');
    Route::get('/students/{student}', [StudentController::class, 'show'])
        ->middleware('permission:students.view|students.view-own');

    Route::prefix('manage')->group(function (): void {
        Route::get('/programmes', [ProgrammeController::class, 'manageIndex'])
            ->middleware('permission:programmes.manage');
        Route::post('/programmes', [ProgrammeController::class, 'store'])
            ->middleware('permission:programmes.manage');
        Route::put('/programmes/{programme}', [ProgrammeController::class, 'update'])
            ->middleware('permission:programmes.manage');
        Route::delete('/programmes/{programme}', [ProgrammeController::class, 'destroy'])
            ->middleware('permission:programmes.manage');

        Route::get('/applications', [ApplicationController::class, 'index'])
            ->middleware('permission:applications.view');
        Route::patch('/applications/{application}', [ApplicationController::class, 'review'])
            ->middleware('permission:applications.manage');
        Route::get('/applications/{application}/documents/{document}/download', [ApplicationController::class, 'downloadDocument'])
            ->middleware('permission:applications.view');

        Route::get('/dashboard', [PortalController::class, 'manageDashboard'])
            ->middleware('permission:courses.manage|students.view|applications.view');
        Route::get('/courses', [CourseController::class, 'index'])
            ->middleware('permission:courses.manage');
        Route::post('/courses', [CourseController::class, 'store'])
            ->middleware('permission:courses.manage');
        Route::patch('/courses/{course}', [CourseController::class, 'update'])
            ->middleware('permission:courses.manage');
        Route::delete('/courses/{course}', [CourseController::class, 'destroy'])
            ->middleware('permission:courses.manage');
        Route::patch('/grades/{submission}', [PortalController::class, 'reviewGrade'])
            ->middleware('permission:grades.manage');
        Route::get('/grades/pending', [PortalController::class, 'pendingGrades'])
            ->middleware('permission:grades.manage');

        Route::post('/students/accounts', [StudentController::class, 'createAccount'])
            ->middleware('permission:students.manage');
        Route::post('/students/{student}/invitation', [StudentController::class, 'resendInvitation'])
            ->middleware('permission:students.manage');
        Route::post('/students', [StudentController::class, 'store'])
            ->middleware('permission:students.manage');
        Route::patch('/students/{student}', [StudentController::class, 'update'])
            ->middleware('permission:students.manage');

        Route::get('/staff', [StaffController::class, 'index'])
            ->middleware('permission:staff.view');
        Route::post('/staff/accounts', [StaffController::class, 'createAccount'])
            ->middleware('permission:staff.manage');
        Route::post('/staff', [StaffController::class, 'store'])
            ->middleware('permission:staff.manage');
        Route::patch('/staff/{staff}', [StaffController::class, 'update'])
            ->middleware('permission:staff.manage');

        Route::get('/roles', [RoleController::class, 'index'])
            ->middleware('permission:roles.manage');
        Route::post('/users', [RoleController::class, 'storeUser'])
            ->middleware('permission:roles.manage');
        Route::put('/users/{user}/roles', [RoleController::class, 'assign'])
            ->middleware('permission:roles.manage');
    });

    Route::get('/student-portal', [PortalController::class, 'student'])
        ->middleware('permission:student.portal.view');
    Route::middleware('permission:student.portal.view')->prefix('student')->group(function (): void {
        Route::get('/profile', [StudentSelfServiceController::class, 'profile']);
        Route::patch('/profile', [StudentSelfServiceController::class, 'updateProfile']);
        Route::post('/profile/photo', [StudentSelfServiceController::class, 'uploadPhoto']);
        Route::get('/courses/available', [StudentSelfServiceController::class, 'availableCourses']);
        Route::post('/courses/register', [StudentSelfServiceController::class, 'registerCourse']);
        Route::post('/courses/registrations/{registration}/drop', [StudentSelfServiceController::class, 'dropCourse']);
        Route::get('/announcements', [StudentSelfServiceController::class, 'announcements']);
        Route::post('/announcements/{announcement}/read', [StudentSelfServiceController::class, 'markAnnouncementRead']);
        Route::get('/service-requests', [StudentSelfServiceController::class, 'serviceRequests']);
        Route::post('/service-requests', [StudentSelfServiceController::class, 'createServiceRequest']);
    });
    Route::get('/alumni-portal', [PortalController::class, 'alumni'])
        ->middleware('permission:alumni.portal.view');
    Route::get('/teaching/overview', [PortalController::class, 'teachingOverview'])
        ->middleware('permission:teaching.assignments.view');
    Route::post('/teaching/courses/{course}/attendance', [PortalController::class, 'markAttendance'])
        ->middleware('permission:teaching.assignments.manage');
    Route::post('/teaching/courses/{course}/materials', [PortalController::class, 'uploadMaterial'])
        ->middleware('permission:teaching.assignments.manage');
    Route::get('/teaching/courses/{course}/materials/{material}', [PortalController::class, 'downloadMaterial'])
        ->middleware('permission:teaching.assignments.view|student.portal.view|courses.manage');
    Route::post('/teaching/courses/{course}/assessments', [PortalController::class, 'createAssessment'])
        ->middleware('permission:teaching.assignments.manage');
    Route::post('/teaching/courses/{course}/grades', [PortalController::class, 'submitGrades'])
        ->middleware('permission:teaching.assignments.manage');
    Route::get('/finance/overview', [PortalController::class, 'financeOverview'])
        ->middleware('permission:finance.view');
});
