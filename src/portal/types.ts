import type { ApiProgramme } from '../api'

export type StudentPortalData = {
  student: {
    id: number
    student_number: string
    status: string
    phone: string | null
    address: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    enrolled_at: string | null
    user: { name: string; email: string }
    programme: Pick<ApiProgramme, 'id' | 'name' | 'award' | 'slug'> | null
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

export const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const money = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' })
