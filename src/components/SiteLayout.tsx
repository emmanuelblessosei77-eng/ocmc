import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Facebook, Instagram, Menu, X } from 'lucide-react'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Programmes', to: '/programmes' },
  { label: 'Admissions', to: '/admissions' },
  { label: 'Facilities', to: '/facilities' },
  { label: 'Student life', to: '/student-life' },
  { label: 'Alumni', to: '/alumni' },
  { label: 'News', to: '/news' },
  { label: 'Contact', to: '/contact' },
]

function Brand() {
  return (
    <Link to="/" reloadDocument className="flex w-fit min-w-0 shrink-0 flex-col items-center text-center" aria-label="OCMC home">
      <img src="/images/ocmc-logo.png" alt="OCMC logo" className="h-[126px] w-[164px] shrink-0 object-contain mix-blend-screen sm:h-[154px] sm:w-[200px] xl:h-[166px] xl:w-[216px]" />
      <span className="mt-1 max-w-[230px] text-sm font-extrabold uppercase leading-tight tracking-wide text-white sm:text-base">
        Oxford School of Communication &amp; Media College
      </span>
    </Link>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-30 border-b-2 border-gold bg-navy shadow-lg">
      <div className="site-header-inner container-width grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 py-3 sm:gap-x-5 xl:grid-cols-[216px_minmax(0,1fr)] xl:items-center xl:gap-x-4 xl:py-4">
        <Brand />
        <nav aria-label="Main navigation" className="hidden min-w-0 items-center justify-between gap-2 xl:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              reloadDocument
              end={item.to === '/'}
              className={({ isActive }) => `whitespace-nowrap text-base font-extrabold transition hover:text-gold 2xl:text-lg ${isActive ? 'text-gold underline decoration-gold decoration-2 underline-offset-8' : 'text-white/90'}`}
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/admissions" reloadDocument className="shrink-0 whitespace-nowrap rounded-sm bg-gold px-3 py-2.5 text-base font-extrabold text-navy transition hover:bg-[#d7b66f] 2xl:px-4">
            Apply to OCMC
          </Link>
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="mt-3 inline-flex rounded p-2 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold xl:hidden"
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-t border-white/10 bg-navy px-5 pb-5 shadow-card xl:hidden">
          <div className="container-width flex min-w-0 gap-2 overflow-x-auto py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                reloadDocument
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `shrink-0 whitespace-nowrap rounded px-3 py-3 text-sm font-semibold ${isActive ? 'bg-white/10 text-gold' : 'text-white/90 hover:bg-white/5 hover:text-gold'}`}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/admissions" reloadDocument onClick={() => setMenuOpen(false)} className="shrink-0 whitespace-nowrap rounded bg-gold px-3 py-3 text-sm font-extrabold text-navy hover:bg-[#e5c46f]">Apply to OCMC <span aria-hidden="true">→</span></Link>
            <Link to="/login" reloadDocument onClick={() => setMenuOpen(false)} className="shrink-0 whitespace-nowrap rounded border border-white/30 px-3 py-3 text-sm font-bold text-white hover:border-gold hover:text-gold">Student &amp; staff sign in</Link>
          </div>
        </nav>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container-width grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr] lg:gap-8">
        <div>
          <Brand />
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/65">Growing curious minds and confident leaders through education, opportunity and community.</p>
          <div className="mt-5 flex gap-3">
            <a href="https://www.facebook.com/" aria-label="Facebook" className="rounded-full border border-white/20 p-2.5 text-white/75 transition hover:border-gold hover:text-gold"><Facebook size={15} /></a>
            <a href="https://www.instagram.com/" aria-label="Instagram" className="rounded-full border border-white/20 p-2.5 text-white/75 transition hover:border-gold hover:text-gold"><Instagram size={15} /></a>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-gold">Explore</h2>
          <ul className="space-y-3 text-sm text-white/70">
            {navItems.slice(1, 5).map((item) => <li key={item.to}><Link reloadDocument className="transition hover:text-white" to={item.to}>{item.label}</Link></li>)}
            <li><Link reloadDocument className="transition hover:text-white" to="/portals">Portal guide</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-gold">Discover</h2>
          <ul className="space-y-3 text-sm text-white/70">
            {navItems.slice(5).map((item) => <li key={item.to}><Link reloadDocument className="transition hover:text-white" to={item.to}>{item.label}</Link></li>)}
            <li><Link reloadDocument className="transition hover:text-white" to="/login">Student portal</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-gold">Get in touch</h2>
          <address className="space-y-3 text-sm not-italic leading-6 text-white/70">
            <p>Oxford School of Communication<br />&amp; Media College, Ghana</p>
            <a className="block hover:text-white" href="mailto:admissions@ocmc.edu.gh">admissions@ocmc.edu.gh</a>
            <a className="block hover:text-white" href="tel:+233302000000">+233 (0) 30 200 0000</a>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-width flex flex-col justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Oxford School of Communication &amp; Media College.</p>
          <p>Learn with purpose. Lead with confidence.</p>
        </div>
      </div>
    </footer>
  )
}

export function PageHero({ eyebrow, title, description, image, imageFit = 'cover' }: { eyebrow: string; title: string; description: string; image?: string; imageFit?: 'cover' | 'contain' }) {
  return (
    <section className="page-hero relative overflow-hidden text-white">
      {image && <div className={`page-hero-image absolute inset-0 opacity-40 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[56%] lg:opacity-65 ${imageFit === 'contain' ? 'bg-contain bg-right bg-no-repeat' : 'bg-cover bg-center'}`} style={{ backgroundImage: `url(${image})` }} />}
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/35" />
      <div className="container-width relative py-16 sm:py-20 lg:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/90 sm:text-lg">{description}</p>
      </div>
    </section>
  )
}

export function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description?: string; centered?: boolean }) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-3">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>}
    </div>
  )
}
