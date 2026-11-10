import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, downloadProtectedFile, type ApiProgramme, type Paginated } from './api'
import { PageHero, SectionHeading } from './components/SiteLayout'
import { confirmAction, notifyError, notifySuccess } from './lib/feedback'

const token = () => sessionStorage.getItem('ocmc_access_token') ?? ''

function storedRoles(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem('ocmc_roles') ?? '[]')
    return Array.isArray(value) ? value.filter((role): role is string => typeof role === 'string') : []
  } catch {
    return []
  }
}

function DashboardFrame({ title, children }: { title: string; children: ReactNode }) {
  const [signOutError, setSignOutError] = useState('')
  async function signOut() {
    setSignOutError('')
    if (!await confirmAction('Sign out of your OCMC account?', 'You will need to sign in again to access your dashboard.', 'Sign out')) return
    try {
      await apiRequest('/auth/logout', { method: 'POST', token: token() })
      sessionStorage.removeItem('ocmc_access_token')
      sessionStorage.removeItem('ocmc_roles')
      await notifySuccess('You have been signed out.')
      window.location.assign('/login')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Sign out failed.'
      setSignOutError(message)
      void notifyError('Sign out failed', message)
    }
  }
  return <>
    <PageHero eyebrow="OCMC portal" title={title} description="Your role-based workspace for OCMC academic and administrative services." />
    <section className="container-width min-h-[50vh] py-10 sm:py-14">
      {token() && <div className="mb-5 flex justify-end"><button type="button" onClick={() => void signOut()} className="border border-slate-200 px-4 py-2 text-sm font-semibold text-navy hover:bg-cream">Sign out</button></div>}
      {signOutError && <ErrorMessage>{signOutError}</ErrorMessage>}
      {!token() && <div role="alert" className="border border-gold/50 bg-cream p-5 text-sm leading-6 text-navy">
        Sign in to view this dashboard. <Link to="/login" className="ml-1 font-bold underline">Go to sign in</Link>
      </div>}
      {token() && children}
    </section>
  </>
}

function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{children}</p>
}

function StatCards({ items }: { items: Array<{ label: string; value: string | number; detail?: string }> }) {
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => <div key={item.label} className="border border-slate-200 bg-white p-5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
      <dd className="mt-2 font-display text-3xl text-navy">{item.value}</dd>
      {item.detail && <p className="mt-1 text-xs text-slate-500">{item.detail}</p>}
    </div>)}
  </dl>
}

function DataTable<T>({
  rows,
  empty,
  columns,
  keyFor,
  pageSize,
}: {
  rows: T[]
  empty: string
  columns: Array<{ label: string; render: (row: T) => ReactNode }>
  keyFor: (row: T, index: number) => string | number
  pageSize?: number
}) {
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [rows])
  if (rows.length === 0) return <p className="border border-slate-200 p-5 text-sm text-slate-600">{empty}</p>
  const lastPage = pageSize ? Math.ceil(rows.length / pageSize) : 1
  const visibleRows = pageSize ? rows.slice((page - 1) * pageSize, page * pageSize) : rows
  return <div>
    <div className="overflow-x-auto border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={column.label} scope="col" className="px-4 py-3 font-semibold">{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 bg-white">{visibleRows.map((row, index) => <tr key={keyFor(row, index)} className="align-top">{columns.map((column) => <td key={column.label} className="px-4 py-3 text-slate-700">{column.render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {pageSize && lastPage > 1 && <Pagination current={page} last={lastPage} onChange={setPage} />}
  </div>
}

function SearchBox({ label, value, onChange, onSubmit }: {
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <form onSubmit={onSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row">
    <label htmlFor="dashboard-search" className="sr-only">{label}</label>
    <input id="dashboard-search" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} className="min-w-0 flex-1 border border-slate-200 px-3 py-2.5 text-sm" />
    <button className="bg-navy px-4 py-2.5 text-sm font-bold text-white">Search</button>
  </form>
}

function Pagination({ current, last, onChange }: { current: number; last: number; onChange: (page: number) => void }) {
  if (last <= 1) return null
  return <nav aria-label="Table pagination" className="mt-4 flex items-center justify-between">
    <button type="button" disabled={current <= 1} onClick={() => onChange(current - 1)} className="border border-slate-200 px-3 py-2 text-sm font-semibold text-navy disabled:opacity-40">Previous</button>
    <span aria-live="polite" className="text-sm text-slate-600">Page {current} of {last}</span>
    <button type="button" disabled={current >= last} onClick={() => onChange(current + 1)} className="border border-slate-200 px-3 py-2 text-sm font-semibold text-navy disabled:opacity-40">Next</button>
  </nav>
}

type StudentPortalData = {
  student: {
    id: number
    student_number: string
    status: string
    phone: string | null
    enrolled_at: string | null
    user: { name: string; email: string }
    programme: Pick<ApiProgramme, 'id' | 'name' | 'award'> | null
  }
  registrations: Array<{
    id: number
    academic_year: string
    term: string
    status: string
    course: {
      id: number
      code: string
      title: string
      credits: number
      lecturer: { id: number; name: string } | null
      sessions: Array<{ id: number; day_of_week: number; starts_at: string; ends_at: string; room: string | null; term: string; academic_year: string }>
      materials: Array<{ id: number; title: string; description: string | null; original_name: string; size: number }>
    }
    attendance_records: Array<{ class_date: string; status: string }>
  }>
  results: Array<{ id: number; score: string; feedback: string | null; approved_at: string; assessment: { title: string; max_score: string; course: { code: string; title: string } } }>
  fee_statements: Array<{ id: number; reference: string; academic_year: string; term: string; total_amount: string; amount_paid: string; due_at: string | null; status: string; items: Array<{ id: number; description: string; amount: string }> }>
  statistics: { registered_courses: number; attendance_percentage: number; approved_results: number; outstanding_fees: number }
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const money = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' })

export function StudentDashboard() {
  const [data, setData] = useState<StudentPortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const loadDashboard = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      setData(await apiRequest<StudentPortalData>('/student-portal', { token: token() }))
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : 'Student dashboard could not be loaded.'
      setError(message)
      void notifyError('Student dashboard could not be refreshed', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard(true)
  }, [loadDashboard])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'courses', label: 'Courses' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'results', label: 'Results' },
    { id: 'fees', label: 'Fees' },
  ]

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab)
    const nextIndex = event.key === 'ArrowRight'
      ? (currentIndex + 1) % tabs.length
      : event.key === 'ArrowLeft'
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : -1
    if (nextIndex >= 0) {
      event.preventDefault()
      setActiveTab(tabs[nextIndex].id)
      document.getElementById(`student-tab-${tabs[nextIndex].id}`)?.focus()
    }
  }

  async function downloadMaterial(courseId: number, material: StudentPortalData['registrations'][number]['course']['materials'][number]) {
    try {
      await downloadProtectedFile(`/teaching/courses/${courseId}/materials/${material.id}`, token(), material.original_name)
      void notifySuccess(`${material.title} downloaded.`)
    } catch (failure: unknown) {
      const message = failure instanceof Error ? failure.message : 'Course material could not be downloaded.'
      setError(message)
      void notifyError('Course material could not be downloaded', message)
    }
  }

  return <DashboardFrame title="Student dashboard.">
    {loading && !data && <p role="status" className="border border-slate-200 p-5 text-sm text-slate-600">Loading your student dashboard…</p>}
    {error && <ErrorMessage>{error}</ErrorMessage>}
    {data && <>
      <section className="mb-6 flex flex-col justify-between gap-5 border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-7">
        <div className="flex items-center gap-4">
          <img src="/images/student-campus-portrait.jpg" alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/50 sm:h-20 sm:w-20" />
          <div><p className="eyebrow">Welcome back, {data.student.user.name}</p><h2 className="mt-1 font-display text-2xl text-navy sm:text-3xl">{data.student.programme?.name ?? 'Student portal'}</h2><p className="mt-2 text-sm text-slate-600">Student number {data.student.student_number} <span aria-hidden="true">·</span> <span className="capitalize">{data.student.status.replace(/_/g, ' ')}</span></p></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="text-sm text-slate-600 sm:text-right"><p>{data.student.user.email}</p><p>{data.student.programme?.award ?? 'Programme not assigned'}</p></div>
          <button type="button" disabled={refreshing} onClick={() => void loadDashboard()} className="border border-slate-300 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-cream disabled:opacity-50">{refreshing ? 'Refreshing…' : 'Refresh data'}</button>
        </div>
      </section>
      <nav aria-label="Student dashboard sections" className="mb-8 overflow-x-auto border-b border-slate-200">
        <div role="tablist" aria-label="Student information" className="flex min-w-max gap-1">
          {tabs.map((tab) => <button key={tab.id} id={`student-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`student-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={handleTabKeyDown} onClick={() => setActiveTab(tab.id)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === tab.id ? 'border-gold text-navy' : 'border-transparent text-slate-500 hover:text-navy'}`}>{tab.label}</button>)}
        </div>
      </nav>
      <section id="student-panel-overview" role="tabpanel" aria-labelledby="student-tab-overview" hidden={activeTab !== 'overview'}>
        <StatCards items={[
          { label: 'Registered courses', value: data.statistics.registered_courses, detail: 'Current student record' },
          { label: 'Attendance', value: `${data.statistics.attendance_percentage}%`, detail: 'Recorded attendance' },
          { label: 'Approved results', value: data.statistics.approved_results, detail: 'Published results' },
          { label: 'Outstanding fees', value: money.format(data.statistics.outstanding_fees), detail: 'Balance on statements' },
        ]} />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="border border-slate-200 bg-white p-5 sm:p-6">
            <SectionHeading eyebrow="Your learning" title="Continue with your courses." description="View course details and access materials shared with your account." />
            <button type="button" onClick={() => setActiveTab('courses')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Open courses <span aria-hidden="true">→</span></button>
          </section>
          <section className="border border-slate-200 bg-white p-5 sm:p-6">
            <SectionHeading eyebrow="Academic record" title="Stay up to date." description={`${data.statistics.approved_results} approved result${data.statistics.approved_results === 1 ? '' : 's'} and ${data.statistics.registered_courses} registered course${data.statistics.registered_courses === 1 ? '' : 's'} currently appear in your portal.`} />
            <button type="button" onClick={() => setActiveTab('results')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">View results <span aria-hidden="true">→</span></button>
          </section>
        </div>
        <section className="mt-6 border border-slate-200 bg-white p-5 sm:p-6">
          <SectionHeading eyebrow="Student services" title="Need a hand?" description="For questions about your records, fees or access, contact OCMC and include your student number." />
          <Link to="/contact" className="mt-5 inline-flex items-center gap-2 bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-[#142b4d]">Contact OCMC <span aria-hidden="true">→</span></Link>
        </section>
      </section>
      <section id="student-panel-courses" role="tabpanel" aria-labelledby="student-tab-courses" hidden={activeTab !== 'courses'}>
        <SectionHeading eyebrow="This term" title="Course registrations." description="Your active course registrations, assigned lecturers and available course materials." />
          <div className="mt-4"><DataTable rows={data.registrations} keyFor={(row) => row.id} empty="No active course registrations are recorded for your account." columns={[
            { label: 'Course', render: (row) => <><strong className="text-navy">{row.course.code}</strong><span className="block">{row.course.title}</span></> },
            { label: 'Programme / term', render: (row) => `${row.academic_year} · ${row.term}` },
            { label: 'Credits', render: (row) => row.course.credits },
            { label: 'Registration status', render: (row) => <span className="capitalize">{row.status}</span> },
            { label: 'Lecturer', render: (row) => row.course.lecturer?.name ?? 'Not assigned' },
            { label: 'Materials', render: (row) => row.status !== 'registered' ? 'Registration ended' : row.course.materials.length ? <ul className="space-y-1">{row.course.materials.map((material) => <li key={material.id}><button type="button" onClick={() => void downloadMaterial(row.course.id, material)} className="text-left font-semibold text-navy underline">{material.title}</button></li>)}</ul> : 'None published' },
          ]} pageSize={10} /></div>
      </section>
      <section id="student-panel-timetable" role="tabpanel" aria-labelledby="student-tab-timetable" hidden={activeTab !== 'timetable'}>
        <SectionHeading eyebrow="Weekly schedule" title="Timetable." description="Scheduled classes for your currently registered courses. Room details are shown when published." />
          <div className="mt-4"><DataTable rows={data.registrations.filter((registration) => registration.status === 'registered').flatMap((registration) => registration.course.sessions.map((session) => ({ ...session, courseCode: registration.course.code, courseTitle: registration.course.title })))} keyFor={(row) => row.id} empty="No timetable sessions have been published." columns={[
            { label: 'Day', render: (row) => weekDays[row.day_of_week] ?? '—' },
            { label: 'Time', render: (row) => `${row.starts_at.slice(0, 5)}–${row.ends_at.slice(0, 5)}` },
            { label: 'Course', render: (row) => <><strong className="text-navy">{row.courseCode}</strong><span className="block">{row.courseTitle}</span></> },
            { label: 'Room / term', render: (row) => `${row.room ?? 'TBA'} · ${row.term}` },
          ]} pageSize={10} /></div>
      </section>
      <section id="student-panel-attendance" role="tabpanel" aria-labelledby="student-tab-attendance" hidden={activeTab !== 'attendance'}>
        <SectionHeading eyebrow="Your record" title="Attendance." description="Attendance entries recorded for your courses. If you have a question about an entry, contact your lecturer or OCMC." />
          <div className="mt-4"><DataTable rows={data.registrations.flatMap((registration) => registration.attendance_records.map((record, index) => ({ ...record, id: `${registration.id}-${index}`, code: registration.course.code, title: registration.course.title })))} keyFor={(row) => row.id} empty="No attendance records have been entered." columns={[
            { label: 'Date', render: (row) => row.class_date },
            { label: 'Course', render: (row) => `${row.code} · ${row.title}` },
            { label: 'Attendance', render: (row) => <span className="capitalize">{row.status}</span> },
          ]} pageSize={10} /></div>
      </section>
      <section id="student-panel-results" role="tabpanel" aria-labelledby="student-tab-results" hidden={activeTab !== 'results'}>
        <SectionHeading eyebrow="Published by your school" title="Approved results." description="Only results approved by authorized OCMC staff appear here. Unapproved assessments are not displayed." />
          <div className="mt-4"><DataTable rows={data.results} keyFor={(row) => row.id} empty="No approved results are available yet." columns={[
            { label: 'Course', render: (row) => `${row.assessment.course.code} · ${row.assessment.course.title}` },
            { label: 'Assessment', render: (row) => row.assessment.title },
            { label: 'Result', render: (row) => `${row.score} / ${row.assessment.max_score}` },
            { label: 'Approved', render: (row) => new Date(row.approved_at).toLocaleDateString() },
            { label: 'Feedback', render: (row) => row.feedback ?? '—' },
          ]} pageSize={10} /></div>
      </section>
      <section id="student-panel-fees" role="tabpanel" aria-labelledby="student-tab-fees" hidden={activeTab !== 'fees'}>
        <SectionHeading eyebrow="Student finance" title="Fee statements." description="Statements linked to your own student record. Online payment is not available in this portal; contact Finance for payment support." />
          <div className="mt-4"><DataTable rows={data.fee_statements} keyFor={(row) => row.id} empty="No fee statements are available for your account." columns={[
            { label: 'Reference', render: (row) => <strong className="text-navy">{row.reference}</strong> },
            { label: 'Term', render: (row) => `${row.academic_year} · ${row.term}` },
            { label: 'Total / paid', render: (row) => <>{money.format(Number(row.total_amount))}<span className="block text-xs text-slate-500">Paid {money.format(Number(row.amount_paid))}</span></> },
            { label: 'Balance / due', render: (row) => <>{money.format(Math.max(0, Number(row.total_amount) - Number(row.amount_paid)))}<span className="block text-xs text-slate-500">{row.due_at ?? 'No due date'}</span></> },
            { label: 'Status', render: (row) => <span className="capitalize">{row.status}</span> },
          ]} pageSize={10} /></div>
        <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-navy underline hover:text-gold">Contact OCMC about a statement <span aria-hidden="true">→</span></Link>
      </section>
    </>}
    {!loading && !data && error && <button type="button" onClick={() => void loadDashboard(true)} className="mt-4 border border-navy px-4 py-2.5 text-sm font-bold text-navy hover:bg-cream">Retry loading dashboard</button>}
  </DashboardFrame>
}

type TeachingCourse = {
  id: number
  code: string
  title: string
  description: string | null
  credits: number
  programme: { id: number; name: string } | null
  sessions: Array<{ id: number; day_of_week: number; starts_at: string; ends_at: string; room: string | null; term: string; academic_year: string }>
  registrations: Array<{ id: number; status: string; student: { id: number; student_number: string; user: { name: string; email: string } } }>
  materials: Array<{ id: number; title: string; description: string | null; original_name: string; size: number; created_at: string }>
  assessments: Array<{ id: number; title: string; max_score: string; due_at: string | null; pending_submissions_count: number }>
  registered_students_count: number
}

type TeachingData = {
  courses: TeachingCourse[]
  statistics: { assigned_courses: number; enrolled_students: number; pending_grade_submissions: number; course_materials: number }
}

export function LecturerDashboard() {
  const [data, setData] = useState<TeachingData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [courseSearch, setCourseSearch] = useState('')

  useEffect(() => {
    let active = true
    apiRequest<TeachingData>('/teaching/overview', { token: token() })
      .then((response) => { if (active) setData(response) })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Teaching dashboard could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  async function download(courseId: number, material: TeachingCourse['materials'][number]) {
    try {
      await downloadProtectedFile(`/teaching/courses/${courseId}/materials/${material.id}`, token(), material.original_name)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Course material could not be downloaded.')
    }
  }

  return <DashboardFrame title="Lecturer dashboard.">
    {loading && <p role="status" className="text-sm text-slate-600">Loading your assigned courses…</p>}
    {error && <ErrorMessage>{error}</ErrorMessage>}
    {data && <>
      <StatCards items={[
        { label: 'Assigned courses', value: data.statistics.assigned_courses },
        { label: 'Enrolled students', value: data.statistics.enrolled_students },
        { label: 'Grade submissions pending', value: data.statistics.pending_grade_submissions },
        { label: 'Course materials', value: data.statistics.course_materials },
      ]} />
      <section className="mt-10"><SectionHeading eyebrow="Teaching workspace" title="Your assigned courses." description="Manage course resources, attendance and grade submissions for courses assigned to your account." />
        {data.courses.length > 0 && <label className="mt-4 block max-w-xl text-xs font-semibold text-slate-600">Search assigned courses
          <input type="search" value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="Course code or title" className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" />
        </label>}
        {data.courses.length === 0 && <p className="mt-5 border border-slate-200 p-5 text-sm text-slate-600">No active courses are assigned to your lecturer account. Contact the Registrar.</p>}
        <div className="mt-5 space-y-5">{data.courses.filter((course) => `${course.code} ${course.title}`.toLocaleLowerCase().includes(courseSearch.toLocaleLowerCase())).map((course) => <LecturerCourseCard key={course.id} course={course} onSaved={() => setRefresh((value) => value + 1)} onDownload={download} onError={setError} />)}</div>
      </section>
    </>}
  </DashboardFrame>
}

function LecturerCourseCard({
  course,
  onSaved,
  onDownload,
  onError,
}: {
  course: TeachingCourse
  onSaved: () => void
  onDownload: (courseId: number, material: TeachingCourse['materials'][number]) => Promise<void>
  onError: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10))
  const [attendance, setAttendance] = useState<Record<number, string>>({})
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterPage, setRosterPage] = useState(1)
  const [assessmentId, setAssessmentId] = useState('')
  const [scores, setScores] = useState<Record<number, string>>({})
  const filteredRegistrations = course.registrations.filter((registration) =>
    `${registration.student.user.name} ${registration.student.student_number}`.toLocaleLowerCase().includes(rosterSearch.toLocaleLowerCase())
  )
  const rosterLastPage = Math.max(1, Math.ceil(filteredRegistrations.length / 10))
  const visibleRegistrations = filteredRegistrations.slice((rosterPage - 1) * 10, rosterPage * 10)
  const allAttendanceMarked = course.registrations.length > 0
    && course.registrations.every((registration) => Boolean(attendance[registration.student.id]))

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await apiRequest(`/teaching/courses/${course.id}/attendance`, {
        method: 'POST',
        token: token(),
        body: {
          class_date: attendanceDate,
          attendance: course.registrations.map((registration) => ({
            student_id: registration.student.id,
            status: attendance[registration.student.id],
          })),
        },
      })
      setMessage('Attendance saved.')
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Attendance could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true)
    setMessage('')
    try {
      await apiRequest(`/teaching/courses/${course.id}/materials`, { method: 'POST', token: token(), formData: new FormData(form) })
      form.reset()
      setMessage('Course material uploaded privately.')
      onSaved()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Course material could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  async function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    try {
      await apiRequest(`/teaching/courses/${course.id}/assessments`, {
        method: 'POST',
        token: token(),
        body: { title: values.get('title'), max_score: Number(values.get('max_score')), due_at: values.get('due_at') || null },
      })
      form.reset()
      setMessage('Assessment created.')
      onSaved()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Assessment could not be created.')
    } finally {
      setBusy(false)
    }
  }

  async function submitGrades(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await apiRequest(`/teaching/courses/${course.id}/grades`, {
        method: 'POST',
        token: token(),
        body: {
          assessment_id: Number(assessmentId),
          grades: course.registrations.filter((registration) => scores[registration.student.id] !== undefined).map((registration) => ({
            student_id: registration.student.id,
            score: Number(scores[registration.student.id]),
          })),
        },
      })
      setMessage('Grades submitted for approval. Students will see them after an authorized reviewer approves them.')
      onSaved()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Grades could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  return <article className="border border-slate-200 bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
      <div><p className="font-mono text-sm font-bold text-gold">{course.code}</p><h3 className="mt-1 font-display text-2xl text-navy">{course.title}</h3><p className="mt-1 text-sm text-slate-500">{course.programme?.name ?? 'No programme'} · {course.credits} credits · {course.registered_students_count} students</p></div>
      <p className="text-sm text-slate-500">{course.sessions.length} timetable sessions</p>
    </div>
    {message && <p role="status" className="mt-4 border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <div className="mt-5 grid gap-7 xl:grid-cols-2">
      <section><h4 className="font-semibold text-navy">Class roster & attendance</h4>
        <form onSubmit={saveAttendance} className="mt-3 space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Class date<input required type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="mt-1 block border border-slate-200 px-3 py-2 text-sm" /></label>
          {course.registrations.length > 0 && <label className="block text-xs font-semibold text-slate-600">Find a student<input type="search" value={rosterSearch} onChange={(event) => { setRosterPage(1); setRosterSearch(event.target.value) }} placeholder="Name or student number" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>}
          {visibleRegistrations.map((registration) => <label key={registration.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
            <span>{registration.student.user.name}<span className="ml-2 text-xs text-slate-500">{registration.student.student_number}</span></span>
            <select required aria-label={`Attendance for ${registration.student.user.name}`} value={attendance[registration.student.id] ?? ''} onChange={(event) => setAttendance((current) => ({ ...current, [registration.student.id]: event.target.value }))} className="border border-slate-200 bg-white px-2 py-1.5 text-xs">
              <option value="">Select status</option>{['present', 'absent', 'late', 'excused'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>)}
          {rosterLastPage > 1 && <Pagination current={rosterPage} last={rosterLastPage} onChange={setRosterPage} />}
          {course.registrations.length === 0 && <p className="text-sm text-slate-500">No registered students.</p>}
          <button disabled={busy || !allAttendanceMarked} className="bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{allAttendanceMarked ? 'Save attendance' : 'Mark every student to continue'}</button>
        </form>
      </section>
      <section><h4 className="font-semibold text-navy">Course materials</h4>
        <ul className="mt-2 space-y-2">{course.materials.map((material) => <li key={material.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm"><span>{material.title}<span className="block text-xs text-slate-500">{material.original_name}</span></span><button type="button" onClick={() => void onDownload(course.id, material)} className="text-xs font-bold text-navy underline">Download</button></li>)}</ul>
        <form onSubmit={uploadMaterial} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <label className="block text-xs font-semibold text-slate-600">Material title<input required name="title" maxLength={255} className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="block text-xs font-semibold text-slate-600">Description (optional)<input name="description" maxLength={2000} className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="block text-xs font-semibold text-slate-600">PDF, Word or PowerPoint · up to 20 MB<input required name="material" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="mt-1 block w-full border border-slate-200 px-2 py-2 text-xs" /></label>
          <button disabled={busy} className="border border-navy px-4 py-2.5 text-sm font-bold text-navy disabled:opacity-50">Upload material privately</button>
        </form>
      </section>
    </div>
    <section className="mt-7 border-t border-slate-100 pt-5"><h4 className="font-semibold text-navy">Grade submissions</h4>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">{course.assessments.map((assessment) => <li key={assessment.id}>{assessment.title} · max {assessment.max_score} · {assessment.pending_submissions_count} pending review</li>)}</ul>
      <form onSubmit={createAssessment} className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_180px_auto] sm:items-end">
        <label className="text-xs font-semibold text-slate-600">New assessment<input required name="title" maxLength={255} placeholder="Assessment title" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Maximum score<input required name="max_score" type="number" min="1" step="0.01" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Due date<input name="due_at" type="date" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
        <button disabled={busy} className="bg-gold px-3 py-2 text-sm font-bold text-navy">Create</button>
      </form>
      {course.assessments.length > 0 && course.registrations.length > 0 && <form onSubmit={submitGrades} className="mt-5 space-y-3">
        <label className="block max-w-sm text-xs font-semibold text-slate-600">Assessment
          <select required value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Choose an assessment</option>{course.assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title} (max {assessment.max_score})</option>)}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">{visibleRegistrations.map((registration) => <label key={registration.id} className="flex items-center justify-between gap-3 border border-slate-100 p-2 text-xs text-slate-600">{registration.student.user.name}
          <input aria-label={`Grade for ${registration.student.user.name}`} type="number" min="0" step="0.01" value={scores[registration.student.id] ?? ''} onChange={(event) => setScores((current) => ({ ...current, [registration.student.id]: event.target.value }))} className="w-24 border border-slate-200 px-2 py-1.5 text-sm" />
        </label>)}</div>
        <button disabled={busy || !assessmentId} className="bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Submit selected grades for approval</button>
      </form>}
    </section>
  </article>
}

type AdminStatistics = {
  students?: number
  active_students?: number
  staff?: number
  active_courses?: number
  pending_applications?: number
  applications_by_status?: Record<string, number>
}

type CourseRecord = {
  id: number
  code: string
  title: string
  description: string | null
  credits: number
  is_active: boolean
  lecturer_id: number | null
  lecturer: { id: number; name: string } | null
  programme: { id: number; name: string } | null
  registered_students_count: number
}

type StudentRecord = { id: number; student_number: string; status: string; user: { id: number; name: string; email: string }; programme: { name: string } | null }
type StaffRecord = { id: number; employee_number: string; department: string | null; job_title: string | null; status: string; user: { id: number; name: string; email: string } }
type ApplicationRecord = { id: number; reference: string; applicant_name: string; email: string; status: string; programme: { name: string } }
type AdminTab = 'overview' | 'courses' | 'students' | 'staff' | 'applications' | 'grades'
type PendingGrade = {
  id: number
  score: string
  status: string
  assessment: { title: string; max_score: string; course: { code: string; title: string } }
  registration: { student: { student_number: string; user: { name: string } } }
}

export function AdministratorDashboard({ title }: { title: string }) {
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null)
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [students, setStudents] = useState<Paginated<StudentRecord> | null>(null)
  const [staff, setStaff] = useState<Paginated<StaffRecord> | null>(null)
  const [applications, setApplications] = useState<Paginated<ApplicationRecord> | null>(null)
  const [grades, setGrades] = useState<Paginated<PendingGrade> | null>(null)
  const [editingCourse, setEditingCourse] = useState<number | null>(null)
  const [tab, setTab] = useState<AdminTab>('overview')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    apiRequest<{ statistics: AdminStatistics }>('/manage/dashboard', { token: token() })
      .then((response) => { if (active) setStatistics(response.statistics) })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Administrator dashboard could not be loaded.') })
    return () => { active = false }
  }, [refresh])

  useEffect(() => {
    if (tab === 'overview') return
    let active = true
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ page: String(page) })
    if (search) query.set('search', search)
    if (statusFilter) query.set('status', statusFilter)
    const path = tab === 'courses' ? `/manage/courses?${query}`
      : tab === 'students' ? `/students?${query}`
        : tab === 'staff' ? `/manage/staff?${query}`
          : tab === 'grades' ? `/manage/grades/pending?${query}`
            : `/manage/applications?${query}`
    const load = tab === 'courses' ? apiRequest<Paginated<CourseRecord>>(path, { token: token() }).then((response) => { if (active) setCourses(response.data) })
      : tab === 'students' ? apiRequest<Paginated<StudentRecord>>(path, { token: token() }).then((response) => { if (active) setStudents(response) })
        : tab === 'staff' ? apiRequest<Paginated<StaffRecord>>(path, { token: token() }).then((response) => { if (active) setStaff(response) })
          : tab === 'grades' ? apiRequest<Paginated<PendingGrade>>(path, { token: token() }).then((response) => { if (active) setGrades(response) })
            : apiRequest<Paginated<ApplicationRecord>>(path, { token: token() }).then((response) => { if (active) setApplications(response) })
    load
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Records could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tab, page, search, statusFilter, refresh])

  function selectTab(next: AdminTab) {
    setTab(next)
    setPage(1)
    setSearch('')
    setSearchInput('')
    setStatusFilter('')
  }

  function searchRecords(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function reload() {
    setRefresh((value) => value + 1)
  }

  const roles = storedRoles()
  const isSuperAdmin = roles.includes('Super Administrator')
  const canManageCourses = isSuperAdmin || roles.includes('Registrar')
  const canManageStudents = isSuperAdmin || roles.includes('Registrar')
  const canManageStaff = isSuperAdmin
  const tabItems: AdminTab[] = [
    'overview',
    ...(canManageCourses ? ['courses' as const] : []),
    ...(roles.some((role) => ['Super Administrator', 'Registrar', 'Admissions Officer'].includes(role)) ? ['students' as const] : []),
    ...(isSuperAdmin || roles.includes('Registrar') ? ['staff' as const] : []),
    ...(roles.some((role) => ['Super Administrator', 'Registrar', 'Admissions Officer'].includes(role)) ? ['applications' as const] : []),
    ...(isSuperAdmin || roles.includes('Registrar') ? ['grades' as const] : []),
  ]
  return <DashboardFrame title={title}>
    <div className="mb-7 flex flex-wrap gap-2" role="tablist" aria-label="Administrator dashboard sections">
      {tabItems.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => selectTab(item)} className={`border px-4 py-2 text-sm font-semibold capitalize ${tab === item ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:border-gold'}`}>{item}</button>)}
      {roles.includes('Super Administrator') || roles.includes('Admissions Officer') ? <Link to="/staff/admissions" className="ml-auto inline-flex items-center border border-gold px-4 py-2 text-sm font-bold text-navy">Open admissions review</Link> : null}
    </div>
    {actionNotice && <p role="status" className="mb-5 border border-green-200 bg-green-50 p-3 text-sm text-green-800">{actionNotice}</p>}
    {error && <div className="mb-5"><ErrorMessage>{error}</ErrorMessage></div>}
    {loading && <p role="status" className="mb-4 text-sm text-slate-600">Loading records…</p>}
    {tab === 'overview' && statistics && <>
      <StatCards items={[
        ...(statistics.students === undefined ? [] : [{ label: 'Students', value: statistics.students, detail: `${statistics.active_students ?? 0} active` }]),
        ...(statistics.staff === undefined ? [] : [{ label: 'Staff records', value: statistics.staff }]),
        ...(statistics.active_courses === undefined ? [] : [{ label: 'Active courses', value: statistics.active_courses }]),
        ...(statistics.pending_applications === undefined ? [] : [{ label: 'Applications under review', value: statistics.pending_applications }]),
      ]} />
      {statistics.applications_by_status && <section className="mt-10"><SectionHeading eyebrow="Admissions" title="Application status overview." description="Application counts are calculated from authorized admissions records." />
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(statistics.applications_by_status).map(([status, count]) => <div key={status} className="flex justify-between border border-slate-200 p-4 text-sm"><dt className="capitalize text-slate-600">{status.replace(/_/g, ' ')}</dt><dd className="font-bold text-navy">{count}</dd></div>)}</dl>
      </section>}
    </>}
    {tab === 'courses' && <section><div className="mb-4"><SectionHeading eyebrow="Academic administration" title="Courses." description="Search, assign lecturers, and archive academic course records." /></div>
      <SearchBox label="Search course code or title" value={searchInput} onChange={setSearchInput} onSubmit={searchRecords} />
      <RecordStatusFilter tab={tab} value={statusFilter} onChange={(value) => { setPage(1); setStatusFilter(value) }} />
      <CreateCourseForm onCreated={reload} onError={setError} />
      <div className="mt-5"><DataTable rows={courses} keyFor={(row) => row.id} empty="No courses match this search." columns={[
        { label: 'Course', render: (row) => <><strong className="text-navy">{row.code}</strong><span className="block">{row.title}</span></> },
        { label: 'Programme', render: (row) => row.programme?.name ?? '—' },
        { label: 'Lecturer', render: (row) => row.lecturer ? `${row.lecturer.name} (ID ${row.lecturer.id})` : 'Unassigned' },
        { label: 'Students / credits', render: (row) => `${row.registered_students_count} / ${row.credits}` },
        { label: 'Status', render: (row) => row.is_active ? 'Active' : 'Archived' },
        { label: 'Action', render: (row) => <div className="flex gap-3"><button type="button" onClick={() => setEditingCourse(editingCourse === row.id ? null : row.id)} className="font-semibold text-navy underline">Edit</button><button type="button" disabled={!row.is_active} onClick={() => void apiRequest(`/manage/courses/${row.id}`, { method: 'DELETE', token: token() }).then(reload).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Course could not be archived.'))} className="font-semibold text-red-700 underline disabled:opacity-40">Archive</button></div> },
      ]} /></div>
      {editingCourse !== null && <div className="mt-4">{courses.filter((course) => course.id === editingCourse).map((course) => <EditCourseForm key={course.id} course={course} onSaved={() => { setEditingCourse(null); reload() }} onError={setError} />)}</div>}
    </section>}
    {tab === 'students' && <section><div className="mb-4"><SectionHeading eyebrow="Registry" title="Student records." description="View and update authorized student profile status." /></div>
      <SearchBox label="Search name, student number or email" value={searchInput} onChange={setSearchInput} onSubmit={searchRecords} />
      <RecordStatusFilter tab={tab} value={statusFilter} onChange={(value) => { setPage(1); setStatusFilter(value) }} />
      {canManageStudents && <CreateStudentForm onCreated={reload} onError={setError} />}
      <DataTable rows={students?.data ?? []} keyFor={(row) => row.id} empty="No student records match this search." columns={[
        { label: 'Student', render: (row) => <><strong className="text-navy">{row.user.name}</strong><span className="block">{row.user.email}</span></> },
        { label: 'Student number', render: (row) => row.student_number },
        { label: 'Programme', render: (row) => row.programme?.name ?? 'Unassigned' },
        { label: 'Status', render: (row) => canManageStudents ? <select aria-label={`Status for ${row.user.name}`} value={row.status} onChange={(event) => void apiRequest(`/manage/students/${row.id}`, { method: 'PATCH', token: token(), body: { status: event.target.value } }).then(reload).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Student record could not be updated.'))} className="border border-slate-200 bg-white px-2 py-1.5 text-xs">{['active', 'leave', 'graduated', 'suspended'].map((status) => <option key={status} value={status}>{status}</option>)}</select> : row.status },
        ...(canManageStudents ? [{ label: 'Portal access', render: (row: StudentRecord) => <button type="button" onClick={() => void apiRequest<{ invitation_sent: boolean; message: string }>(`/manage/students/${row.id}/invitation`, { method: 'POST', token: token() }).then((response) => { setError(response.invitation_sent ? '' : response.message); setActionNotice(response.invitation_sent ? response.message : '') }).catch((failure: unknown) => { setActionNotice(''); setError(failure instanceof Error ? failure.message : 'Password setup link could not be sent.') })} className="font-semibold text-navy underline">Send setup link</button> }] : []),
      ]} />
      {students && <Pagination current={students.current_page} last={students.last_page} onChange={setPage} />}
    </section>}
    {tab === 'staff' && <section><div className="mb-4"><SectionHeading eyebrow="Human resources" title="Staff records." description="Search authorized staff records and update active status." /></div>
      <SearchBox label="Search name, employee number, department or email" value={searchInput} onChange={setSearchInput} onSubmit={searchRecords} />
      <RecordStatusFilter tab={tab} value={statusFilter} onChange={(value) => { setPage(1); setStatusFilter(value) }} />
      {canManageStaff && <CreateStaffForm onCreated={reload} onError={setError} />}
      <DataTable rows={staff?.data ?? []} keyFor={(row) => row.id} empty="No staff records match this search." columns={[
        { label: 'Staff member', render: (row) => <><strong className="text-navy">{row.user.name}</strong><span className="block">{row.user.email}</span></> },
        { label: 'Employee number', render: (row) => row.employee_number },
        { label: 'Department / title', render: (row) => `${row.department ?? '—'} / ${row.job_title ?? '—'}` },
        { label: 'Status', render: (row) => canManageStaff ? <select aria-label={`Status for ${row.user.name}`} value={row.status} onChange={(event) => void apiRequest(`/manage/staff/${row.id}`, { method: 'PATCH', token: token(), body: { status: event.target.value } }).then(reload).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Staff record could not be updated.'))} className="border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="active">Active</option><option value="inactive">Inactive</option></select> : row.status },
      ]} />
      {staff && <Pagination current={staff.current_page} last={staff.last_page} onChange={setPage} />}
    </section>}
    {tab === 'applications' && <section><div className="mb-4"><SectionHeading eyebrow="Admissions" title="Applications." description="Search applicant records and continue detailed reviews in the admissions workspace." /></div>
      <SearchBox label="Search reference, applicant name or email" value={searchInput} onChange={setSearchInput} onSubmit={searchRecords} />
      <RecordStatusFilter tab={tab} value={statusFilter} onChange={(value) => { setPage(1); setStatusFilter(value) }} />
      <DataTable rows={applications?.data ?? []} keyFor={(row) => row.id} empty="No applications match this search." columns={[
        { label: 'Reference', render: (row) => <strong className="font-mono text-navy">{row.reference}</strong> },
        { label: 'Applicant', render: (row) => <>{row.applicant_name}<span className="block">{row.email}</span></> },
        { label: 'Programme', render: (row) => row.programme.name },
        { label: 'Status', render: (row) => <span className="capitalize">{row.status.replace(/_/g, ' ')}</span> },
        { label: 'Review', render: () => <Link to="/staff/admissions" className="font-semibold text-navy underline">Open review</Link> },
      ]} />
      {applications && <Pagination current={applications.current_page} last={applications.last_page} onChange={setPage} />}
    </section>}
    {tab === 'grades' && <section><div className="mb-4"><SectionHeading eyebrow="Academic records" title="Grade approvals." description="Review lecturer submissions before results become visible to students." /></div>
      <SearchBox label="Search student, course or email" value={searchInput} onChange={setSearchInput} onSubmit={searchRecords} />
      <DataTable rows={grades?.data ?? []} keyFor={(row) => row.id} empty="No grade submissions are waiting for approval." columns={[
        { label: 'Student', render: (row) => <><strong className="text-navy">{row.registration.student.user.name}</strong><span className="block">{row.registration.student.student_number}</span></> },
        { label: 'Course', render: (row) => `${row.assessment.course.code} · ${row.assessment.course.title}` },
        { label: 'Assessment', render: (row) => row.assessment.title },
        { label: 'Score', render: (row) => `${row.score} / ${row.assessment.max_score}` },
        { label: 'Decision', render: (row) => <div className="flex gap-2"><button type="button" onClick={() => void apiRequest(`/manage/grades/${row.id}`, { method: 'PATCH', token: token(), body: { status: 'approved' } }).then(reload).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Grade could not be approved.'))} className="font-bold text-green-700 underline">Approve</button><button type="button" onClick={() => void apiRequest(`/manage/grades/${row.id}`, { method: 'PATCH', token: token(), body: { status: 'rejected' } }).then(reload).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Grade could not be returned.'))} className="font-bold text-red-700 underline">Return</button></div> },
      ]} />
      {grades && <Pagination current={grades.current_page} last={grades.last_page} onChange={setPage} />}
    </section>}
  </DashboardFrame>
}

function CreateCourseForm({ onCreated, onError }: { onCreated: () => void; onError: (message: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [withSession, setWithSession] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    try {
      await apiRequest('/manage/courses', {
        method: 'POST',
        token: token(),
        body: {
          code: values.get('code'),
          title: values.get('title'),
          credits: Number(values.get('credits')),
          programme_id: values.get('programme_id') ? Number(values.get('programme_id')) : null,
          lecturer_id: values.get('lecturer_id') ? Number(values.get('lecturer_id')) : null,
          description: values.get('description') || null,
          sessions: withSession ? [{
            day_of_week: Number(values.get('day_of_week')),
            starts_at: values.get('starts_at'),
            ends_at: values.get('ends_at'),
            room: values.get('room') || null,
            term: values.get('term'),
            academic_year: values.get('academic_year'),
          }] : [],
        },
      })
      form.reset()
      setExpanded(false)
      setWithSession(false)
      onCreated()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Course could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="border border-slate-200 p-4">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} className="text-sm font-bold text-navy">{expanded ? 'Cancel new course' : '+ Create course'}</button>
    {expanded && <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold text-slate-600">Course code<input required name="code" maxLength={40} className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Course title<input required name="title" maxLength={255} className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Credits<input required name="credits" type="number" min="1" max="30" defaultValue="3" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Programme ID (optional)<input name="programme_id" type="number" min="1" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Lecturer user ID (optional)<input name="lecturer_id" type="number" min="1" className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Description<input name="description" maxLength={10000} className="mt-1 block w-full border border-slate-200 px-3 py-2 text-sm" /></label>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={withSession} onChange={(event) => setWithSession(event.target.checked)} />Add a weekly timetable session</label>
      {withSession && <>
        <label className="text-xs font-semibold text-slate-600">Day<select name="day_of_week" className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm">{weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Starts<input required name="starts_at" type="time" className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Ends<input required name="ends_at" type="time" className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Room<input name="room" maxLength={100} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Term<input required name="term" maxLength={100} placeholder="First semester" className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Academic year<input required name="academic_year" maxLength={20} placeholder="2026/2027" className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
      </>}
      <button disabled={busy} className="bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-3">{busy ? 'Creating…' : 'Create course'}</button>
    </form>}
  </div>
}

function EditCourseForm({ course, onSaved, onError }: {
  course: CourseRecord
  onSaved: () => void
  onError: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await apiRequest(`/manage/courses/${course.id}`, {
        method: 'PATCH',
        token: token(),
        body: {
          code: values.get('code'),
          title: values.get('title'),
          credits: Number(values.get('credits')),
          lecturer_id: values.get('lecturer_id') ? Number(values.get('lecturer_id')) : null,
          description: values.get('description') || null,
          is_active: values.get('is_active') === 'true',
        },
      })
      onSaved()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Course could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="grid gap-3 border border-gold/50 bg-cream p-4 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-xs font-semibold text-slate-600">Code<input required name="code" defaultValue={course.code} maxLength={40} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">Title<input required name="title" defaultValue={course.title} maxLength={255} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">Credits<input required name="credits" type="number" min="1" max="30" defaultValue={course.credits} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">Lecturer user ID<input name="lecturer_id" type="number" min="1" defaultValue={course.lecturer_id ?? ''} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">Description<input name="description" defaultValue={course.description ?? ''} maxLength={10000} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">Status<select name="is_active" defaultValue={String(course.is_active)} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2 text-sm"><option value="true">Active</option><option value="false">Archived</option></select></label>
    <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button disabled={busy} className="bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save course'}</button><button type="button" onClick={onSaved} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button></div>
  </form>
}

function RecordStatusFilter({ tab, value, onChange }: { tab: AdminTab; value: string; onChange: (value: string) => void }) {
  const options = tab === 'courses' ? ['active', 'inactive']
    : tab === 'students' ? ['active', 'leave', 'graduated', 'suspended']
      : tab === 'staff' ? ['active', 'inactive']
        : tab === 'applications' ? ['draft', 'submitted', 'under_review', 'additional_documents_requested', 'accepted', 'rejected']
          : []
  if (options.length === 0) return null
  return <label className="mb-4 block max-w-xs text-xs font-semibold text-slate-600">Filter status
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full border border-slate-200 bg-white px-3 py-2.5 text-sm">
      <option value="">All statuses</option>{options.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
    </select>
  </label>
}

function CreateStudentForm({ onCreated, onError }: { onCreated: () => void; onError: (message: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [invitationSent, setInvitationSent] = useState<boolean | null>(null)

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setMessage('')
    setInvitationSent(null)
    try {
      const response = await apiRequest<{ invitation_sent: boolean; message: string }>('/manage/students/accounts', {
        method: 'POST',
        token: token(),
        body: {
          name: values.get('name'),
          email: values.get('email'),
          student_number: values.get('student_number'),
          programme_id: values.get('programme_id') ? Number(values.get('programme_id')) : null,
          phone: values.get('phone') || null,
        },
      })
      setMessage(response.message)
      setInvitationSent(response.invitation_sent)
      if (!response.invitation_sent) {
        onError(response.message)
      }
      setExpanded(false)
      form.reset()
      onCreated()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Student account could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="mb-5 border border-slate-200 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-bold text-navy">Student portal accounts</h3><p className="mt-1 text-xs text-slate-500">Create an account and email the student a secure password setup link.</p></div>
      <button type="button" aria-expanded={expanded} onClick={() => { setExpanded((current) => !current); setMessage(''); setInvitationSent(null) }} className="bg-navy px-4 py-2.5 text-sm font-bold text-white">{expanded ? 'Cancel' : '+ Add student & portal account'}</button>
    </div>
    {message && <p role={invitationSent === false ? 'alert' : 'status'} className={`mt-4 border p-3 text-sm ${invitationSent === false ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-green-200 bg-green-50 text-green-800'}`}>{message}</p>}
    {expanded && <form onSubmit={createAccount} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold text-slate-600">Student full name<input required name="name" autoComplete="name" maxLength={255} className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Student email address<input required name="email" type="email" autoComplete="email" maxLength={255} className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Student number<input required name="student_number" maxLength={50} className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Programme ID (optional)<input name="programme_id" type="number" min="1" className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Phone (optional)<input name="phone" maxLength={40} className="mt-1 block w-full border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <button disabled={busy} className="bg-gold px-4 py-2.5 text-sm font-bold text-navy disabled:opacity-50 sm:col-span-2 lg:col-span-3">{busy ? 'Creating account…' : 'Create account & send password setup link'}</button>
    </form>}
  </div>
}

function CreateStaffForm({ onCreated, onError }: { onCreated: () => void; onError: (message: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [invitationSent, setInvitationSent] = useState<boolean | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setMessage('')
    setInvitationSent(null)
    try {
      const response = await apiRequest<{ invitation_sent: boolean; message: string }>('/manage/staff/accounts', {
        method: 'POST',
        token: token(),
        body: {
          name: values.get('name'),
          email: values.get('email'),
          employee_number: values.get('employee_number'),
          role: values.get('role'),
          department: values.get('department') || null,
          job_title: values.get('job_title') || null,
        },
      })
      setMessage(response.message)
      setInvitationSent(response.invitation_sent)
      if (!response.invitation_sent) onError(response.message)
      setExpanded(false)
      form.reset()
      onCreated()
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Staff record could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="card mb-5 rounded-0 border-slate-200">
    <div className="card-body p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-bold text-navy">Staff portal accounts</h3><p className="mt-1 text-xs text-slate-500">Create a staff ID, assign a least-privilege role and email a secure password setup link.</p></div>
        <button type="button" aria-expanded={expanded} onClick={() => { setExpanded((current) => !current); setMessage(''); setInvitationSent(null) }} className="btn btn-outline-primary rounded-0 border-navy px-3 py-2 text-sm font-bold text-navy">{expanded ? 'Cancel' : '+ Add staff account'}</button>
      </div>
      {message && <p role={invitationSent === false ? 'alert' : 'status'} className={`alert mt-3 mb-0 rounded-0 py-2 text-sm ${invitationSent === false ? 'alert-warning' : 'alert-success'}`}>{message}</p>}
      {expanded && <form onSubmit={submit} className="row g-3 mt-1">
        <div className="col-12"><p className="mb-0 text-xs leading-5 text-slate-500">The employee number is the staff sign-in ID. Staff set their own password from their invitation email. Public self-registration is not available.</p></div>
        <label className="col-12 col-md-6 text-xs font-semibold text-slate-600">Staff full name<input required name="name" autoComplete="name" maxLength={255} className="form-control mt-1 rounded-0 py-2.5 text-sm" /></label>
        <label className="col-12 col-md-6 text-xs font-semibold text-slate-600">Staff email address<input required name="email" type="email" autoComplete="email" maxLength={255} className="form-control mt-1 rounded-0 py-2.5 text-sm" /></label>
        <label className="col-12 col-md-6 text-xs font-semibold text-slate-600">Employee / staff ID<input required name="employee_number" maxLength={50} className="form-control mt-1 rounded-0 py-2.5 text-sm" /></label>
        <label className="col-12 col-md-6 text-xs font-semibold text-slate-600">Portal role<select required name="role" defaultValue="" className="form-select mt-1 rounded-0 py-2.5 text-sm"><option value="" disabled>Select a staff role</option><option>Admissions Officer</option><option>Registrar</option><option>Finance Officer</option><option>Lecturer</option></select></label>
        <label className="col-12 col-md-6 text-xs font-semibold text-slate-600">Department<input name="department" maxLength={255} className="form-control mt-1 rounded-0 py-2.5 text-sm" /></label>
        <label className="col-12 col-md-6 text-xs font-semibold text-slate-600">Job title<input name="job_title" maxLength={255} className="form-control mt-1 rounded-0 py-2.5 text-sm" /></label>
        <div className="col-12"><button disabled={busy} className="btn rounded-0 border-0 bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Creating account…' : 'Create staff account & send setup link'}</button></div>
      </form>}
    </div>
  </div>
}

export function FinanceDashboard() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest<{ message: string }>('/finance/overview', { token: token() })
      .then((response) => { if (active) setMessage(response.message) })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Finance workspace could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return <DashboardFrame title="Finance Officer dashboard.">
    {loading && <p role="status" className="text-sm text-slate-600">Loading finance workspace…</p>}
    {error && <ErrorMessage>{error}</ErrorMessage>}
    {!loading && !error && <section className="max-w-3xl border border-gold/40 bg-cream p-6 sm:p-8">
      <p className="eyebrow">Finance workspace</p>
      <h2 className="mt-3 font-display text-3xl text-navy">Your role access is active.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">Finance records and management tools are not yet available in this dashboard. No financial data is shown here.</p>
      <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Contact OCMC support <span aria-hidden="true">→</span></Link>
    </section>}
  </DashboardFrame>
}

export function RoleDashboard() {
  const roles = storedRoles()
  if (!token()) return <DashboardFrame title="Your OCMC dashboard."><ErrorMessage>Sign in to open your role dashboard.</ErrorMessage><Link to="/login" className="mt-4 inline-block font-bold text-navy underline">Sign in</Link></DashboardFrame>
  if (roles.includes('Super Administrator')) return <AdministratorDashboard title="Super Administrator dashboard." />
  if (roles.includes('Registrar')) return <AdministratorDashboard title="Registrar dashboard." />
  if (roles.includes('Admissions Officer')) return <AdministratorDashboard title="Admissions Officer dashboard." />
  if (roles.includes('Finance Officer')) return <FinanceDashboard />
  if (roles.includes('Lecturer')) return <LecturerDashboard />
  if (roles.includes('Student')) return <StudentDashboard />
  if (roles.includes('Alumni')) return <DashboardFrame title="Alumni dashboard."><p className="border border-slate-200 p-5 text-sm text-slate-600">Welcome to the OCMC alumni portal.</p></DashboardFrame>
  return <DashboardFrame title="Your OCMC dashboard."><ErrorMessage>Your account has no dashboard role. Contact the school administrator if you need access.</ErrorMessage></DashboardFrame>
}
