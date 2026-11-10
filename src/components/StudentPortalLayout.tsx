import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { apiRequest } from '../api'
import { getAccessToken, useAuth } from '../auth'
import { confirmAction, notifyError, notifySuccess } from '../lib/feedback'

const navItems = [
  { to: '/student-portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student-portal/profile', label: 'My Profile', icon: UserRound },
  { to: '/student-portal/registration', label: 'Course Registration', icon: ClipboardList },
  { to: '/student-portal/courses', label: 'My Courses', icon: BookOpen },
  { to: '/student-portal/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/student-portal/results', label: 'Results', icon: GraduationCap },
  { to: '/student-portal/attendance', label: 'Attendance', icon: FileText },
  { to: '/student-portal/fees', label: 'Fees & Payments', icon: CreditCard },
  { to: '/student-portal/resources', label: 'Learning Resources', icon: WalletCards },
  { to: '/student-portal/announcements', label: 'Announcements', icon: Bell },
  { to: '/student-portal/services', label: 'Student Services', icon: FileText },
  { to: '/student-portal/settings', label: 'Settings', icon: Settings },
]

export function StudentPortalLayout({ children }: { children?: ReactNode }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ocmc_portal_theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('portal-dark', darkMode)
    localStorage.setItem('ocmc_portal_theme', darkMode ? 'dark' : 'light')
    return () => document.documentElement.classList.remove('portal-dark')
  }, [darkMode])

  async function signOut() {
    if (!await confirmAction('Sign out of your OCMC account?', 'You will need to sign in again to access the student portal.', 'Sign out')) return
    try {
      await apiRequest('/auth/logout', { method: 'POST', token: getAccessToken() })
      auth.signOutLocal()
      await notifySuccess('You have been signed out.')
      navigate('/login')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed.'
      void notifyError('Sign out failed', message)
    }
  }

  return (
    <div className={`student-portal min-h-screen ${darkMode ? 'bg-[#0b1526] text-slate-100' : 'bg-cream text-navy'}`}>
      <div className="border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded p-2 hover:bg-white/10 lg:hidden" aria-label="Open portal menu" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <Link to="/student-portal" className="flex items-center gap-3 sm:gap-5">
              <img src="/images/ocmc-logo.png" alt="OCMC — Oxford School of Communication & Media College" className="h-24 w-[124px] shrink-0 object-contain mix-blend-screen sm:h-[116px] sm:w-[150px]" />
              <span className="block text-2xl font-black tracking-wide sm:text-4xl">
                Student Portal
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => setDarkMode((value) => !value)} className="hidden rounded border border-white/20 px-3 py-1.5 text-xs font-semibold hover:border-gold sm:inline-flex">
              {darkMode ? 'Light mode' : 'Dark mode'}
            </button>
            <span className="hidden text-white/70 sm:inline">{auth.user?.name}</span>
            <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded bg-gold px-3 py-2 text-xs font-bold text-navy hover:bg-[#d7b66f]">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[260px_1fr]">
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r transition lg:static lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'border-white/10 bg-[#101b2e]' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between border-b border-slate-200/20 px-4 py-4 lg:hidden">
            <p className="text-sm font-bold">Navigation</p>
            <button type="button" aria-label="Close portal menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
          </div>
          <nav aria-label="Student portal" className="space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-navy text-white' : darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-cream'}`}
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="px-4 pb-6">
            <Link to="/" className={`text-xs font-semibold underline ${darkMode ? 'text-gold' : 'text-navy'}`}>Back to public website</Link>
          </div>
        </aside>

        {menuOpen && <button type="button" aria-label="Close menu overlay" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

        <main className="min-h-[70vh] px-4 py-6 sm:px-6 lg:py-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
