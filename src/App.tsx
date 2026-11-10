import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer, Header } from './components/SiteLayout'
import { RoleDashboard } from './dashboards'
import {
  AboutPage,
  AdmissionsPage,
  AlumniPage,
  ContactPage,
  FacilitiesPage,
  HomePage,
  LoginPage,
  NewsPage,
  NotFoundPage,
  ProgrammesPage,
  PortalsPage,
  StudentLifePage,
  StaffAdmissionsPage,
} from './pages'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return <>
    <ScrollToTop />
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <Header />
    <main id="main-content" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/programmes" element={<ProgrammesPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/student-life" element={<StudentLifePage />} />
        <Route path="/alumni" element={<AlumniPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/portals" element={<PortalsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff/admissions" element={<StaffAdmissionsPage />} />
        <Route path="/dashboard" element={<RoleDashboard />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
    <Footer />
  </>
}
