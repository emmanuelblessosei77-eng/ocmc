# OCMC Ghana API

Laravel 13 API for the OCMC Ghana website. The API is intentionally kept in this
`backend/` directory so the existing React/Vite frontend remains unchanged.

## Requirements

- PHP 8.3 or newer with `pdo_pgsql`, `fileinfo`, and `mbstring`
- Composer 2
- PostgreSQL 14 or newer, running locally or remotely

## Local setup (PowerShell)

Install PostgreSQL and ensure its `bin` directory (including `psql`) is on
`PATH`. Create the development database using an account allowed to create
databases:

```powershell
psql -U postgres -c "CREATE DATABASE ocmc;"
```

From the repository root, prepare Laravel and configure PostgreSQL credentials
in `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`,
`DB_PASSWORD`, and, if needed, `DB_SSLMODE`):

```powershell
Set-Location .\backend
Copy-Item .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
```

From the repository root, run `npm run dev:backend` to start the API. The
launcher enables the PHP extensions required by PostgreSQL queries and private
document uploads, including installations that do not have a `php.ini`
configured. Keep this terminal open while using the website.

The API is available at `http://127.0.0.1:8000/api`. Health check:
`http://127.0.0.1:8000/up`.

For local email testing, the default `MAIL_MAILER=log` records password reset
emails in `storage/logs/laravel.log`. Configure SMTP and a production mail
sender before deploying.

### Initial administrator

The seed data does not create a user or ship a default password. To create the
first Super Administrator, set these values in `backend/.env` before running
`php artisan db:seed`:

```dotenv
OCMC_ADMIN_NAME="OCMC Administrator"
OCMC_ADMIN_EMAIL="admin@example.com"
OCMC_ADMIN_PASSWORD="use-a-unique-password-of-at-least-12-characters"
```

Keep the password secret, do not commit `.env`, and remove the bootstrap
credentials from the deployment environment after seeding. Seeding is
idempotent and does not replace the password of an existing account. There is
no public registration endpoint.

### Provisioning student and staff logins

An authorized administrator creates student portal accounts from the student
management dashboard (or `POST /api/manage/students/accounts`). The
administrator assigns the student's unique student number; this is the
student's sign-in ID. The system emails a password setup link to the student's
registered email address. Staff accounts are created from the staff management
dashboard or `POST /api/manage/staff/accounts`; the employee number is their
sign-in ID. Staff setup links are sent to their registered email. Neither flow
emails a password or allows public self-registration. Configure mail delivery
before provisioning real users.

Students and staff sign in with their student/employee ID or registered email
and their privately chosen password. The API rejects an ID if it is
ambiguously assigned to more than one account. Password recovery uses the
registered email address.

## Authentication and access control

- `POST /api/auth/login` accepts `identifier` (student number, employee number,
  or email) and `password`, and returns a Sanctum bearer token. Legacy clients
  may still send `email`. Send the returned token as
  `Authorization: Bearer <token>`.
- `POST /api/auth/logout` revokes the current token.
- `GET /api/auth/me` returns the authenticated account and its role permissions.
- `POST /api/auth/forgot-password` sends a reset link when the account exists.
- `POST /api/auth/reset-password` accepts the email, token, and a confirmed
  password of at least 12 characters. A successful reset revokes all old tokens.
- Reset emails link to the CSRF-protected browser form at
  `/reset-password/{token}`; API clients can submit directly to the JSON reset
  endpoint.
- Login and password-reset endpoints are rate-limited.
- Role and permission checks run on the server for every protected route.
  Super Administrator bypasses named permissions; no client-provided role or
  permission is trusted. The Super Administrator role cannot be self-assigned
  through the role assignment endpoint, and users cannot change their own roles.
- Super Administrators provision accounts through `POST /api/manage/users` and
  manage role assignments through `PUT /api/manage/users/{id}/roles`.
- Authorized staff administrators can create student accounts through
  `POST /api/manage/students/accounts` and staff accounts through
  `POST /api/manage/staff/accounts`; these endpoints issue password setup
  links, never a shared or default password. Staff provisioning only permits
  Admissions Officer, Registrar, Finance Officer, or Lecturer roles. The
  Super Administrator role is not assignable through staff provisioning.
- The active-programme catalogue and guest application intake are public.
  Each application is protected by a random, application-specific access key;
  only its hash is stored in the database. Application review, student records,
  staff data, portals, and administration routes require authentication and
  their declared permissions.
- Students can only list/read their own student profile and linked applications.
  Unlinked applications submitted as a guest are visible to authorized
  admissions staff only.

### Seeded role permissions

| Role | Seeded permissions |
| --- | --- |
| Super Administrator | All permissions |
| Admissions Officer | View/manage applications, view students, manage programmes |
| Registrar | View/manage students, courses and grade approvals; view applications and staff |
| Finance Officer | View/manage finance tools |
| Lecturer | View assigned courses; manage their own course attendance, materials and grade submissions |
| Student | Student dashboard, own profile, registrations, attendance, approved results, fees and linked applications |
| Alumni | Alumni portal |

Roles and permissions are stored in database tables (`roles`, `permissions`,
`role_user`, and `permission_role`) and can be extended in the seeder. Sensitive
business records are not seeded with invented personal data.

## API outline

| Method and path | Access |
| --- | --- |
| `GET /api/programmes`, `GET /api/programmes/{slug}` | Public active programme catalogue |
| `POST /api/applications/drafts`, `POST /api/applications/track` | Guest application draft and reference/access-key tracking (rate limited) |
| `PATCH /api/applications/{id}/draft`, `POST /api/applications/{id}/documents`, `POST /api/applications/{id}/submit` | Applicant access key |
| `GET /api/applications/{id}/status`, `GET /api/applications/{id}/documents/{document}/download` | Applicant access key; private application scope |
| `GET /api/applications/mine` | `applications.view-own` |
| `GET /api/applications/{id}` | `applications.view` or owner |
| `GET /api/students`, `GET /api/students/{id}` | `students.view` or own-record permission |
| `POST /api/manage/students/accounts`, `POST /api/manage/students/{id}/invitation` | `students.manage`; creates a student login or resends a password setup link |
| `GET /api/manage/applications` | `applications.view` |
| `PATCH /api/manage/applications/{id}` | `applications.manage` |
| `/api/manage/programmes` | `programmes.manage` |
| `/api/manage/students` | `students.manage` |
| `/api/manage/staff` | `staff.view` to list; `staff.manage` to write |
| `/api/manage/roles`, `/api/manage/users/{id}/roles` | `roles.manage` |
| `POST /api/manage/users` | `roles.manage` |
| `GET /reset-password/{token}` | Single-use email reset link; web form protected by CSRF |
| `GET /api/student-portal` | `student.portal.view` |
| `GET /api/alumni-portal` | `alumni.portal.view` |
| `GET /api/teaching/overview` | `teaching.assignments.view` |
| `GET /api/finance/overview` | `finance.view` |
| `GET /api/manage/dashboard` | `courses.manage`, `students.view` or `applications.view` |
| `/api/manage/courses` | `courses.manage` |
| `GET /api/manage/grades/pending`, `PATCH /api/manage/grades/{submission}` | `grades.manage` |
| `GET /api/teaching/overview` | `teaching.assignments.view`; returns only courses assigned to the lecturer |
| `POST /api/teaching/courses/{course}/attendance`, `/materials`, `/assessments`, `/grades` | `teaching.assignments.manage` and the assigned lecturer or course administrator |
| `GET /api/teaching/courses/{course}/materials/{material}` | Assigned lecturer, enrolled student, or `courses.manage` |

### Role dashboards and academic records

Sign in at `/login` and open `/dashboard`. The dashboard presents the authenticated
role's workspace: students see their own profile, active course registrations,
weekly timetable, attendance, approved results and fee statements; lecturers
see only assigned courses and can record attendance, upload private course
materials, create assessments, and submit grades for approval. Students can
download private course materials only for courses in which they are currently
registered. Unapproved grades are never included in the student response.

Administrators with the relevant permissions see searchable, paginated student,
staff, course, application and grade-approval records. Course changes require
`courses.manage`; student/staff records retain their existing `students.manage`
and `staff.manage` permissions; application review retains
`applications.manage`. The Registrar can manage courses and review grades but
has read-only access to staff records. The Admissions Officer can view student
and application records but cannot change student records or manage courses.
The server enforces those permissions independently of the dashboard UI.

### Student portal account setup

Students do not self-register for portal access. A Registrar or Super
Administrator creates a student record and account from the **Students** tab in
the dashboard, using the student's email address and assigned student number.
The backend gives the account an undisclosed random initial password and sends
a password setup link to that email; staff never see or send a shared password.
The student follows the one-time link, sets a password of at least 12
characters, then signs in at `/login` and opens `/dashboard`.

The same student table offers **Send setup link** for an existing account.
Email delivery must be configured in `backend/.env` before invitations can be
delivered. With the local `MAIL_MAILER=log` setting, inspect
`backend/storage/logs/laravel.log` for the generated link. A failed email
delivery is reported in the dashboard, and the account remains available for
the Registrar to retry after correcting mail configuration.

Course assignments, registrations, class sessions, attendance, assessments,
grade submissions and fee statements are stored in PostgreSQL. Course materials
are stored on Laravel's private `local` disk and require an authorized
download endpoint; storage paths are not included in API responses. Lecturers
can only change attendance or grades, create assessments and upload materials
for courses assigned to their account. Registrar or Super Administrator review
is required before submitted grades are visible to a student.

Apply the academic-dashboard database migration after updating the backend:

```powershell
Set-Location .\backend
php artisan migrate
```

### Admissions workflow

Applicants begin at `/admissions` and can save a draft after choosing a
programme and entering contact details. Drafts can be resumed from the same
browser session or tracked from the application reference and private access
key. The access key is shown once when the draft is created; applicants must
save it securely because OCMC stores only its hash.

An application can be saved as a draft, submitted, reviewed, returned for
additional documents, accepted, or rejected. Submission requires the applicant
profile, privacy consent, an academic transcript and an identity document.
Additional document requests include one or more document types and a message
to the applicant. When all requested document types are uploaded, the
application returns to `under_review`. Final decisions cannot be reversed.

PDF, JPG and PNG supporting documents up to 10 MB are stored on Laravel's
private `local` disk (`storage/app/private`), with metadata in
`application_documents`. They are never served from the public web root;
download routes check the applicant access key or staff permission and verify
the document belongs to the requested application.
Configure PHP with `upload_max_filesize=12M` and `post_max_size=13M` so the
multipart request overhead does not prevent the full 10 MB file limit from
reaching Laravel. The local development backend sets these limits automatically.

Admissions Officers and Super Administrators can review applications at
`/staff/admissions`. Registrars can view the queue but cannot perform review
actions unless granted `applications.manage`. The server checks the
`applications.view` and `applications.manage` permissions on every staff
request. Applicants receive email notifications for submission and review
status changes; configure `MAIL_MAILER`, SMTP credentials and the sender in
`backend/.env` for delivery (the local `log` mailer writes to
`storage/logs/laravel.log`).

On an existing database, apply any newly added migrations after updating code:

```powershell
Set-Location .\backend
php artisan migrate
```

## Run frontend and API together

Configure PostgreSQL above, then run the backend in one terminal from the
repository root:

```powershell
npm run dev:backend
```

Run Vite in a second terminal:

```powershell
npm run dev
```

The Vite development server proxies `/api` to `http://127.0.0.1:8000`; the
frontend defaults to that relative API path. To use another backend URL, set
`VITE_API_URL` in the root `.env.local` (for example,
`VITE_API_URL=https://api.example.edu.gh/api`) and configure that backend's
`CORS_ALLOWED_ORIGINS` to include the website origin.

The programmes page reads the active catalogue from PostgreSQL. Admissions
applications and contact enquiries are saved to the database. Login and
password-reset requests use the Laravel API. The sign-in bearer token is kept
in the browser session and sent only to authenticated API endpoints.

## Tests

Run the backend feature suite from `backend/`:

```powershell
composer test
```

Tests use an in-memory SQLite database so PostgreSQL is not required to run the
feature suite. They cover unauthenticated requests, role-level denials,
per-student record isolation, Super Administrator access, password resets, and
the public application intake boundary. Student provisioning tests cover
Registrar access, denied roles, password setup, email verification and login.
Admissions workflow tests cover draft
access, submission requirements, private document storage and downloads,
requested-document completion, staff decisions, notifications, and final-state
protection.
