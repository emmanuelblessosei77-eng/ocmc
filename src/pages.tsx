import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Eye,
  EyeOff,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Search,
  UsersRound,
} from 'lucide-react'
import { apiRequest, downloadProtectedFile, type ApiProgramme, type Paginated } from './api'
import { newsItems, programmes } from './data'
import { programmeFallback } from './programmeFallback'
import { PageHero, SectionHeading } from './components/SiteLayout'
import { confirmAction, notifyError, notifySuccess } from './lib/feedback'

const programmeImages: Record<string, string> = {
  'bachelor-of-business-administration': '/images/diverse-students-campus.png',
  'marketing-and-communication': '/images/student-discussion.png',
  'information-technology': '/images/student-computer-lab.jpg',
  'human-resource-management': '/images/library-study-pair.jpg',
  'accounting-and-finance': '/images/programme-accounting-finance.jpg',
  'general-arts': '/images/campus-peer-study.png',
}

function programmeImage(slug: string): string {
  return programmeImages[slug] ?? '/images/diverse-students-campus.png'
}

const campusStories = [
  {
    title: 'Learn together',
    description: 'Share ideas, ask questions and grow through a supportive learning community.',
    image: '/images/student-collaboration.jpg',
    alt: 'Black Ghanaian students collaborating around a table',
  },
  {
    title: 'Find your people',
    description: 'Join campus events, meet new people and find your community beyond the classroom.',
    image: '/images/campus-community-group.jpg',
    alt: 'A group of Ghanaian students together on campus',
  },
  {
    title: 'Bring ideas to life',
    description: 'Take part in practical projects, presentations and creative work.',
    image: '/images/classroom-learning.jpg',
    alt: 'A student focused on a practical learning activity',
  },
]

const homeHeroSlides = [
  { image: '/images/student-collaboration.jpg', alt: 'Students working together on a project around a laptop', caption: 'Ideas grow when we learn together' },
  { image: '/images/diverse-students-campus.png', alt: 'Students spending time together on campus', caption: 'A community to learn and belong' },
  { image: '/images/student-discussion.png', alt: 'Students sharing ideas during a group discussion', caption: 'Curiosity leads to new possibilities' },
]

function CampusShowcase() {
  return (
    <section className="campus-showcase bg-[#f7f5ef] py-16 lg:py-20" aria-labelledby="campus-showcase-title">
      <div className="container">
        <div className="row align-items-end g-4 mb-5">
          <div className="col-lg-8">
            <p className="eyebrow">Life at OCMC</p>
            <h2 id="campus-showcase-title" className="section-title mt-3">A place to learn, create and belong.</h2>
            <p className="mt-3 mb-0 max-w-3xl leading-7 text-slate-600">Discover the experiences that make college life meaningful: learning with others, exploring new ideas and building skills for what comes next. Photos are illustrative student-life imagery.</p>
          </div>
          <div className="col-lg-4 text-lg-end"><Link to="/about" className="inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Discover OCMC <ArrowRight size={16} /></Link></div>
        </div>

        <div className="row g-4">
          {campusStories.map((story) => (
            <div className="col-12 col-md-6 col-xl-4" key={story.title}>
              <article className="card h-100 overflow-hidden rounded-0 border-0 shadow-sm">
                <img src={story.image} alt={story.alt} className="card-img-top campus-story-image" loading="lazy" />
                <div className="card-body d-flex flex-column p-4">
                  <h3 className="card-title font-display text-2xl text-navy">{story.title}</h3>
                  <p className="card-text flex-grow-1 text-sm leading-6 text-slate-600">{story.description}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProgrammeCard({ programme }: { programme: (typeof programmes)[number] }) {
  const Icon = programme.icon
  return (
    <article className="group flex h-full flex-col border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-gold/50 hover:shadow-card">
      <img src={programme.image} alt="" className="mb-5 h-44 w-full object-cover" loading="lazy" />
      <span className="flex h-12 w-12 items-center justify-center bg-cream text-navy"><Icon size={22} strokeWidth={1.7} /></span>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{programme.category}</p>
      <h3 className="mt-2 font-display text-2xl text-navy">{programme.title}</h3>
      <p className="mt-2 text-xs font-semibold text-slate-500">{programme.award}</p>
      <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{programme.description}</p>
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{programme.duration}</span>
        <Link to="/admissions" className="inline-flex items-center gap-1 font-bold text-navy group-hover:text-gold">Explore <ArrowRight size={14} /></Link>
      </div>
    </article>
  )
}

export function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [slidesPaused, setSlidesPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    updatePreference()
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (slidesPaused || reducedMotion) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % homeHeroSlides.length)
    }, 5500)
    return () => window.clearInterval(timer)
  }, [slidesPaused, reducedMotion])

  function showSlide(offset: number) {
    setActiveSlide((current) => (current + offset + homeHeroSlides.length) % homeHeroSlides.length)
  }

  return (
    <>
      <section className="home-hero relative overflow-hidden px-3 py-4 sm:px-6 sm:py-8 lg:py-12" aria-label="Welcome to OCMC">
        <div className="home-hero-frame container-width relative grid min-h-[560px] overflow-hidden rounded-xl bg-navy text-white shadow-2xl sm:rounded-2xl lg:min-h-[680px] lg:grid-cols-[.88fr_1.12fr]">
          <div className="home-hero-pattern pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative z-10 flex min-w-0 flex-col items-start justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-white/5 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-gold"><MapPin size={14} /> Oxford School of Communication &amp; Media College · Ghana</p>
            <h1 className="mt-7 max-w-2xl font-display text-5xl font-bold leading-[1.04] sm:text-6xl lg:text-[68px]">Find your voice.<br /><span className="text-gold">Shape what’s next.</span></h1>
            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-white/85 sm:text-lg">Grow your ideas, develop practical skills and take your next step with a supportive college community behind you.</p>
            <div className="mt-8 flex w-full flex-wrap gap-3">
              <Link to="/admissions" className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gold px-6 py-3.5 text-sm font-extrabold text-navy shadow-lg transition hover:-translate-y-0.5 hover:bg-[#e5c46f]">Apply to OCMC <ArrowRight size={17} /></Link>
              <Link to="/programmes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/40 px-6 py-3.5 text-sm font-bold text-white transition hover:border-gold hover:bg-white/5 hover:text-gold">Explore programmes <ArrowRight size={17} /></Link>
            </div>
            <p className="mt-7 text-xs font-semibold tracking-wide text-white/65">Communication <span className="mx-2 text-gold">·</span> Business <span className="mx-2 text-gold">·</span> Technology</p>
          </div>
          <div className="home-hero-media relative mx-3 mb-3 min-h-[300px] overflow-hidden rounded-lg border border-gold/50 sm:mx-5 sm:mb-5 lg:mx-0 lg:my-5 lg:mr-5 lg:min-h-0">
            {homeHeroSlides.map((slide, index) => <div
              key={slide.image}
              role="img"
              aria-label={slide.alt}
              aria-hidden={index !== activeSlide}
              className={`home-hero-slide absolute inset-0 bg-cover bg-center ${index === activeSlide ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />)}
            <div className="home-hero-image-shade absolute inset-0" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold">Life at OCMC</p>
                <p className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl" aria-live="polite">{homeHeroSlides[activeSlide].caption}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Campus photo slideshow controls">
                <button type="button" onClick={() => showSlide(-1)} aria-label="Previous campus photo" className="rounded-full border border-white/60 bg-navy/70 p-2.5 text-white transition hover:border-gold hover:text-gold"><ArrowLeft size={17} /></button>
                <div className="flex items-center gap-2">
                  {homeHeroSlides.map((slide, index) => <button key={slide.image} type="button" onClick={() => setActiveSlide(index)} aria-label={`Show campus photo ${index + 1}`} aria-pressed={activeSlide === index} className={`h-2.5 rounded-full transition-all ${activeSlide === index ? 'w-8 bg-gold' : 'w-2.5 bg-white/70 hover:bg-white'}`} />)}
                </div>
                {!reducedMotion && <button type="button" onClick={() => setSlidesPaused((paused) => !paused)} aria-label={slidesPaused ? 'Play campus photos' : 'Pause campus photos'} aria-pressed={slidesPaused} className="rounded-full border border-white/60 bg-navy/70 p-2.5 text-white transition hover:border-gold hover:text-gold">
                  {slidesPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-width grid gap-3 py-5 sm:grid-cols-3 sm:gap-4 sm:py-7" aria-label="Explore OCMC">
        {[
          { icon: BookOpen, title: 'Find your programme', text: 'Compare study areas and discover where your interests can take you.', to: '/programmes' },
          { icon: GraduationCap, title: 'Plan your application', text: 'Learn about the admissions process and get ready for your next step.', to: '/admissions' },
          { icon: UsersRound, title: 'Explore college life', text: 'Get to know the community, campus and experiences at OCMC.', to: '/student-life' },
        ].map(({ icon: Icon, title, text, to }) => (
          <Link key={title} to={to} className="group flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-gold/70 hover:shadow-card sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-cream text-navy transition group-hover:bg-gold"><Icon size={22} /></span>
            <span className="min-w-0"><span className="flex items-center justify-between gap-2 font-bold text-navy">{title}<ArrowRight size={16} className="shrink-0 text-gold transition group-hover:translate-x-1" /></span><span className="mt-1 block text-sm leading-6 text-slate-600">{text}</span></span>
          </Link>
        ))}
      </section>

      <section className="container-width grid gap-12 py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-28">
        <div className="relative">
          <img src="/images/student-campus-portrait.jpg" alt="A Ghanaian student on campus" className="h-[400px] w-full object-cover sm:h-[460px]" />
          <div className="absolute -bottom-5 right-0 bg-gold px-6 py-5 text-navy sm:-right-5">
            <p className="font-display text-3xl">Your future,</p><p className="text-xs font-bold uppercase tracking-widest">well within reach</p>
          </div>
        </div>
        <div className="lg:pl-10">
          <SectionHeading eyebrow="Welcome to OCMC" title="Big ideas start with a place to belong." />
          <p className="mt-6 leading-7 text-slate-600">At Oxford School of Communication &amp; Media College, you’ll find more than a qualification. You’ll find a close-knit community, supportive lecturers and the freedom to turn your ambitions into action.</p>
          <p className="mt-4 leading-7 text-slate-600">We pair a strong academic foundation with practical experience, helping every student grow the confidence to make a difference in Ghana and beyond.</p>
          <Link to="/about" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Get to know us <ArrowRight size={16} /></Link>
        </div>
      </section>

      <CampusShowcase />

      <section className="container-width grid gap-8 py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-20">
        <div>
          <SectionHeading eyebrow="An OCMC education" title="A strong foundation, built for real life." description="OCMC brings academic learning, practical projects and a supportive community together. Our goal is to help students build knowledge, confidence and skills they can carry into their next chapter." />
          <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Explore our mission and values <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: 'Six areas of study', text: 'Explore business, communication and technology programmes.', to: '/programmes', image: '/images/student-computer-lab.jpg' },
            { title: 'A guided application', text: 'Understand the steps and get support from admissions.', to: '/admissions', image: '/images/student-portrait.jpg' },
            { title: 'Learn together', text: 'Discover the campus community and student experience.', to: '/facilities', image: '/images/campus-community.jpg' },
            { title: 'Stay connected', text: 'Follow college news, stories and community updates.', to: '/news', image: '/images/campus-collaboration.jpg' },
          ].map((item) => <Link key={item.title} to={item.to} className="group relative flex min-h-36 items-end overflow-hidden bg-navy p-5 text-white">
            <img src={item.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-70" />
            <span className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/30 to-transparent" />
            <span className="relative"><span className="block font-display text-2xl">{item.title}</span><span className="mt-1 block text-xs leading-5 text-white/80">{item.text}</span></span>
          </Link>)}
        </div>
      </section>

      <section className="bg-cream py-20 lg:py-24">
        <div className="container-width">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="Find your direction" title="A programme for your next step." description="Explore a range of practical, career-focused programmes designed to open doors." />
            <Link to="/programmes" className="mb-1 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">View all programmes <ArrowRight size={16} /></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programmes.slice(0, 3).map((item) => <ProgrammeCard key={item.title} programme={item} />)}
          </div>
        </div>
      </section>

      <section className="container-width grid gap-12 py-20 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-24">
        <div className="order-2 lg:order-1">
          <SectionHeading eyebrow="Your journey starts here" title="Make your next move count." description="Applying to college is a big step. We’re here to make yours a little easier, from your first question to your first day on campus." />
          <div className="mt-8 space-y-4">
            {['Explore programmes and entry requirements', 'Get guidance from our admissions team', 'Take the first step towards your future'].map((step, i) => <div key={step} className="flex items-center gap-3 text-sm font-medium text-slate-700"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-xs font-bold text-gold">{i + 1}</span>{step}</div>)}
          </div>
          <Link to="/admissions" className="mt-8 inline-flex items-center gap-2 bg-navy px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#142b4d]">Explore admissions <ArrowRight size={16} /></Link>
        </div>
        <img src="/images/student-graduate.png" alt="A Ghanaian graduate celebrating their achievement" className="order-1 h-[360px] w-full object-cover lg:order-2 lg:h-[440px]" />
      </section>

      <section className="container-width py-6 sm:py-10">
        <div className="relative overflow-hidden rounded-xl bg-navy px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14">
          <div className="home-hero-pattern pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="eyebrow">A place to grow</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">Bring your curiosity. Build what comes next.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Explore your options, discover a community that supports your growth, and take your next step at OCMC.</p>
          </div>
          <Link to="/about" className="relative mt-6 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded border border-gold px-5 py-3 text-sm font-bold text-gold transition hover:bg-gold hover:text-navy lg:mt-0">Get to know OCMC <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="container-width py-20 lg:py-24">
        <div className="flex items-end justify-between gap-5">
          <SectionHeading eyebrow="On campus" title="The latest from OCMC." />
          <Link to="/news" className="mb-1 hidden items-center gap-2 text-sm font-bold text-navy hover:text-gold sm:inline-flex">All news <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-9 grid gap-6 md:grid-cols-3">
          {newsItems.map((item) => <article key={item.title} className="group">
            <Link to="/news" className="block overflow-hidden"><img src={item.image} alt={item.imageAlt ?? ''} className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" /></Link>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{item.category} <span className="mx-1 text-slate-300">·</span> {item.date}</p>
            <h3 className="mt-2 font-display text-2xl leading-snug text-navy"><Link to="/news" className="hover:text-gold">{item.title}</Link></h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
          </article>)}
        </div>
      </section>

      <section className="bg-cream py-14">
        <div className="container-width flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div><p className="eyebrow">Your future starts now</p><h2 className="mt-2 font-display text-3xl text-navy sm:text-4xl">Ready to find your place?</h2></div>
          <Link to="/admissions" className="inline-flex items-center justify-center gap-2 bg-gold px-6 py-4 text-sm font-bold text-navy hover:bg-[#d7b66f]">Start your application <ArrowRight size={16} /></Link>
        </div>
      </section>
    </>
  )
}

export function AboutPage() {
  return <>
    <PageHero eyebrow="Get to know OCMC" title="An education for a changing world." description="We bring people, ideas and opportunity together to help every student discover what they can do — and who they can become." image="/images/campus-community-group.jpg" />
    <section className="container-width grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
      <img src="/images/international-study-group.jpg" alt="A diverse group of students learning together" className="h-[380px] w-full object-cover" />
      <div><SectionHeading eyebrow="Our story" title="A college built around possibility." /><p className="mt-5 leading-7 text-slate-600">Oxford School of Communication &amp; Media College (OCMC) is a higher education community in Ghana with a clear purpose: to help people gain the knowledge and confidence to shape a better future.</p><p className="mt-4 leading-7 text-slate-600">Our approach combines thoughtful teaching, practical experience and a genuine commitment to each student’s growth. We believe a great education should be both ambitious and personal.</p><p className="mt-4 leading-7 text-slate-600">Here, different perspectives are welcomed, questions are encouraged and learning is connected to the world beyond campus.</p></div>
    </section>
    <section className="bg-cream py-16 lg:py-20"><div className="container-width grid gap-10 md:grid-cols-3">{[
      ['Our vision', 'To be a trusted centre of learning that inspires people to make a positive contribution in Ghana and across the world.'],
      ['Our mission', 'To provide accessible, high-quality education that develops capable professionals, thoughtful citizens and lifelong learners.'],
      ['Our values', 'Integrity in every action. Curiosity in every classroom. Respect for every voice. Excellence in all we do.'],
    ].map(([title, text]) => <article key={title} className="border-t-2 border-gold pt-5"><h2 className="font-display text-3xl text-navy">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}</div></section>
    <section className="container-width py-16 lg:py-20"><SectionHeading eyebrow="What guides us" title="Learning with purpose. Leading with care." centered /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[['01', 'Student-centred', 'Every student deserves the support and space to do their best work.'], ['02', 'Practical by design', 'Learning connects to real questions, real people and real possibilities.'], ['03', 'Always curious', 'We make room for new ideas, different perspectives and lifelong learning.'], ['04', 'Rooted in community', 'We grow stronger when we contribute to the communities around us.']].map(([n, title, desc]) => <div key={n} className="border border-slate-200 p-5"><span className="font-display text-3xl text-gold">{n}</span><h3 className="mt-4 font-bold text-navy">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p></div>)}</div></section>
  </>
}

export function ProgrammesPage() {
  const [filter, setFilter] = useState('All programmes')
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogue, setCatalogue] = useState<ApiProgramme[]>(programmeFallback)
  const [catalogueError, setCatalogueError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setCatalogueError('')
    apiRequest<Paginated<ApiProgramme> & { data_source?: string }>('/programmes')
      .then((response) => {
        if (!active) return
        setCatalogue(response.data)
        setCatalogueError(response.data_source === 'local-fallback'
          ? 'The API is unavailable. Showing the saved programme catalogue while the connection recovers.'
          : '')
      })
      .catch((error: unknown) => {
        if (!active) return
        setCatalogue(programmeFallback)
        setCatalogueError(error instanceof Error ? error.message : 'Could not connect to the live programme service.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [retryCount])
  useEffect(() => {
      if (!catalogueError) return
      const timer = window.setTimeout(() => setRetryCount((count) => count + 1), 30000)
      return () => window.clearTimeout(timer)
  }, [catalogueError, retryCount])
  const filters = ['All programmes', 'Business', 'Communication', 'Technology']
  const visible = (filter === 'All programmes' ? catalogue : catalogue.filter((programme) => programme.category === filter))
    .filter((programme) => `${programme.name} ${programme.award} ${programme.description}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .map((programme) => ({
      title: programme.name,
      image: programmeImage(programme.slug),
      award: programme.award,
      duration: `${programme.duration_years} years`,
      description: programme.description,
      category: programme.category,
      icon: programmes.find((item) => item.category === programme.category)?.icon ?? programmes[0].icon,
    }))
  return <>
    <PageHero eyebrow="Find your direction" title="Learn the skills to move forward." description="Explore practical programmes shaped around the knowledge, confidence and experience employers value." image="/images/student-collaboration.jpg" />
    <section className="container-width py-14 sm:py-20">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><SectionHeading eyebrow="Explore our programmes" title="Your next chapter starts here." description="Find the programme that fits your interests and the future you want to build." /><p className="text-sm font-semibold text-slate-600" aria-live="polite">{loading ? 'Checking live catalogue…' : `${visible.length} ${visible.length === 1 ? 'programme' : 'programmes'}`}</p></div>
      <label htmlFor="programme-search" className="sr-only">Search programmes</label>
      <div className="relative mt-8 max-w-xl">
        <Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input id="programme-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by programme, subject or qualification" className="w-full rounded border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base font-medium text-navy shadow-sm placeholder:font-normal placeholder:text-slate-500 focus:border-navy" />
      </div>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter programmes">
        {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`rounded-full border px-5 py-3 text-sm font-bold transition ${filter === item ? 'border-navy bg-navy text-white' : 'border-slate-300 text-slate-700 hover:border-gold hover:text-navy'}`}>{item}</button>)}
      </div>
      {catalogueError && <div role="status" className="mt-8 flex flex-col justify-between gap-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center"><p><span className="font-bold">Showing the saved programme catalogue.</span> The live catalogue is unavailable ({catalogueError}).</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-amber-800 px-4 py-2.5 font-bold hover:bg-amber-100 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Try again</button></div>}
      {visible.length > 0 ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((programme) => <ProgrammeCard key={programme.title} programme={programme} />)}</div> : <p className="mt-8 rounded border border-slate-200 bg-cream p-8 text-center text-base font-semibold text-slate-700">No programmes match that search. Try another subject or select a different category.</p>}
      <div className="mt-12 flex flex-col justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row sm:items-center"><p className="max-w-2xl text-sm leading-6 text-slate-600">Not sure which programme is right for you? Our admissions team can help you explore your options and understand entry requirements.</p><Link to="/contact" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-navy hover:text-gold">Talk to our team <ArrowRight size={16} /></Link></div>
    </section>
  </>
}

type ApplicantApplication = {
  id: number
  reference: string
  status: string
  applicant_name: string
  email: string
  phone: string
  programme: Pick<ApiProgramme, 'id' | 'name' | 'slug' | 'award'> | null
  date_of_birth: string | null
  nationality: string | null
  address: string | null
  previous_education: string | null
  personal_statement: string | null
  submitted_at: string | null
  requested_document_types: string[]
  documents: Array<{ id: number; document_type: string; original_name: string; size: number }>
  events: Array<{ event_type: string; to_status: string | null; message: string; created_at: string }>
}

type ApplicationFields = {
  applicant_name: string
  email: string
  phone: string
  programme_id: string
  date_of_birth: string
  nationality: string
  address: string
  previous_education: string
  personal_statement: string
}

const emptyApplicationFields: ApplicationFields = {
  applicant_name: '',
  email: '',
  phone: '',
  programme_id: '',
  date_of_birth: '',
  nationality: '',
  address: '',
  previous_education: '',
  personal_statement: '',
}

const documentLabels: Record<string, string> = {
  academic_transcript: 'Academic transcript',
  identity_document: 'Identity document',
  proof_of_results: 'Proof of results',
  personal_statement: 'Personal statement document',
  other: 'Other supporting document',
}

function formatApplicationStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

function ApplicantDocumentUploader({
  application,
  accessKey,
  onUploaded,
}: {
  application: ApplicantApplication
  accessKey: string
  onUploaded: (document: ApplicantApplication['documents'][number]) => Promise<void>
}) {
  const [documentType, setDocumentType] = useState(application.requested_document_types[0] ?? 'academic_transcript')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const canUpload = ['draft', 'additional_documents_requested'].includes(application.status)
  const allowedTypes = application.status === 'additional_documents_requested'
    ? application.requested_document_types
    : canUpload ? ['academic_transcript', 'identity_document', 'proof_of_results', 'personal_statement', 'other'] : []
  const uploadedTypes = new Set(application.documents.map((document) => document.document_type))

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    const form = event.currentTarget
    const values = new FormData(form)
    const file = values.get('document')
    if (!(file instanceof File)) {
      setError('Select a PDF, JPG or PNG document to upload.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The selected file is larger than 10 MB. Choose a smaller file and try again.')
      return
    }
    setUploading(true)
    try {
      const response = await apiRequest<{ document: ApplicantApplication['documents'][number] }>(`/applications/${application.id}/documents`, {
        method: 'POST',
        token: accessKey,
        formData: values,
      })
      form.reset()
      setDocumentType(allowedTypes[0] ?? 'other')
      try {
        await onUploaded(response.document)
        setNotice(`${documentLabels[response.document.document_type] ?? 'Document'} uploaded successfully.`)
        void notifySuccess('Your document was uploaded securely.')
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : 'Application details could not be refreshed.'
        setNotice(`Your document was uploaded successfully, but application details could not be refreshed. ${message}`)
        void notifyError('Document uploaded; refresh failed', message)
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'The document could not be uploaded.'
      setError(message)
      void notifyError('Document upload failed', message)
    } finally {
      setUploading(false)
    }
  }

  return <div className="mt-6 border-t border-slate-200 pt-5">
    <h3 className="font-semibold text-navy">{application.status === 'additional_documents_requested' ? 'Upload requested documents' : 'Supporting documents'}</h3>
    {notice && <p role="status" className="mt-3 border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <ul className="mt-3 space-y-2 text-sm text-slate-600">
      {application.documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-3">
        <span>{documentLabels[document.document_type] ?? document.document_type}: {document.original_name}</span>
        <span className="text-xs">{(document.size / 1024).toFixed(0)} KB</span>
      </li>)}
    </ul>
    {application.status === 'additional_documents_requested' && application.requested_document_types.map((type) => (
      <p key={type} className={`mt-2 text-xs ${uploadedTypes.has(type) ? 'text-green-700' : 'font-semibold text-gold'}`}>
        {uploadedTypes.has(type) ? 'Received' : 'Requested'}: {documentLabels[type] ?? type}
      </p>
    ))}
    {allowedTypes.length > 0 && <form onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      <label className="block text-xs font-semibold text-slate-700">Document type
        <select name="document_type" value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm">
          {allowedTypes.map((type) => <option key={type} value={type}>{documentLabels[type] ?? type}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-700">PDF, JPG or PNG · up to 10 MB
        <input required name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="mt-2 block w-full border border-slate-200 bg-white px-2 py-2 text-xs" />
      </label>
      <button disabled={uploading} className="bg-navy px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{uploading ? 'Uploading…' : 'Upload securely'}</button>
    </form>}
  </div>
}

function ApplicantStatusPanel({
  application,
  accessKey,
  onRefresh,
}: {
  application: ApplicantApplication
  accessKey: string
  onRefresh: () => Promise<void>
}) {
  return <div className="mt-8 max-w-3xl border border-slate-200 p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Application reference</p><p className="mt-1 font-mono text-lg font-bold text-navy">{application.reference}</p></div>
      <span className="bg-cream px-3 py-2 text-xs font-bold uppercase tracking-wide text-navy">{formatApplicationStatus(application.status)}</span>
    </div>
    <p className="mt-4 text-sm text-slate-600">{application.applicant_name} · {application.programme?.name}</p>
    {application.status === 'accepted' && <p role="status" className="mt-5 border border-green-200 bg-green-50 p-4 text-sm text-green-900">Congratulations. Your application has been accepted.</p>}
    {application.status === 'rejected' && <p role="status" className="mt-5 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Your application has received a final decision. See the timeline below for the message from admissions.</p>}
    {application.status === 'draft' && <div className="mt-5 border border-gold/40 bg-cream p-4 text-sm leading-6 text-navy">Your draft is saved securely. Continue editing below, or use your application reference and private access key to resume it later. Keep the key private.</div>}
    {application.status !== 'draft' && <ApplicantDocumentUploader application={application} accessKey={accessKey} onUploaded={onRefresh} />}
    {application.events.length > 0 && <div className="mt-6"><h3 className="font-semibold text-navy">Application updates</h3><ol className="mt-3 space-y-4 border-l border-gold/50 pl-4">{[...application.events].reverse().map((event, index) => <li key={`${event.event_type}-${index}`}><p className="text-sm font-semibold text-navy">{formatApplicationStatus(event.to_status ?? event.event_type)}</p><p className="mt-1 text-sm leading-6 text-slate-600">{event.message}</p><time className="mt-1 block text-xs text-slate-400">{new Date(event.created_at).toLocaleString()}</time></li>)}</ol></div>}
  </div>
}

function AdmissionsProgrammePicker({
  programmes: catalogue,
  catalogueError,
  selectedProgrammeId,
  onSelect,
}: {
  programmes: ApiProgramme[]
  catalogueError: string
  selectedProgrammeId: string
  onSelect: (programmeId: number) => void
}) {
  if (catalogueError || catalogue.length === 0) return null

  return <section className="container-width py-10 lg:py-14" aria-labelledby="admissions-programmes-title">
    <SectionHeading eyebrow="Find your programme" title="Explore your study options." description="Choose a programme to preselect it in your application." />
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {catalogue.map((programme) => {
        const selected = String(programme.id) === selectedProgrammeId
        return <article key={programme.id} className={`flex h-full flex-col overflow-hidden border bg-white transition hover:-translate-y-1 hover:shadow-card ${selected ? 'border-gold ring-2 ring-gold/40' : 'border-slate-200'}`}>
          <img src={programmeImage(programme.slug)} alt="" className="h-48 w-full object-cover" loading="lazy" />
          <div className="flex flex-1 flex-col p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{programme.category}</p>
            <h3 className="mt-2 font-display text-2xl text-navy">{programme.name}</h3>
            <p className="mt-2 text-xs font-semibold text-slate-500">{programme.award}</p>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{programme.description}</p>
            <button type="button" aria-pressed={selected} onClick={() => onSelect(programme.id)} className={`mt-5 w-full px-4 py-3 text-sm font-bold transition ${selected ? 'bg-gold text-navy' : 'bg-navy text-white hover:bg-[#142b4d]'}`}>
              {selected ? 'Selected for your application' : 'Choose this programme'}
            </button>
          </div>
        </article>
      })}
    </div>
  </section>
}

function ApplicationForm({
  programmes: catalogue,
  catalogueError,
  initialProgrammeId,
  resumeDraft,
}: {
  programmes: ApiProgramme[]
  catalogueError: string
  initialProgrammeId: string
  resumeDraft: { application: ApplicantApplication; accessKey: string } | null
}) {
  const [application, setApplication] = useState<ApplicantApplication | null>(null)
  const [accessKey, setAccessKey] = useState('')
  const [fields, setFields] = useState<ApplicationFields>(emptyApplicationFields)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  useEffect(() => {
    if (initialProgrammeId) {
      setFields((current) => ({ ...current, programme_id: initialProgrammeId }))
    }
  }, [initialProgrammeId])

  useEffect(() => {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key === 'ocmc_current_application' || key?.startsWith('ocmc_application_')) {
        sessionStorage.removeItem(key)
      }
    }
  }, [])

  useEffect(() => {
    if (!resumeDraft) return
    const { application: savedApplication, accessKey: savedAccessKey } = resumeDraft
    setApplication(savedApplication)
    setAccessKey(savedAccessKey)
    setFields({
      applicant_name: savedApplication.applicant_name ?? '',
      email: savedApplication.email ?? '',
      phone: savedApplication.phone ?? '',
      programme_id: String(savedApplication.programme?.id ?? ''),
      date_of_birth: savedApplication.date_of_birth ?? '',
      nationality: savedApplication.nationality ?? '',
      address: savedApplication.address ?? '',
      previous_education: savedApplication.previous_education ?? '',
      personal_statement: savedApplication.personal_statement ?? '',
    })
    setStep(1)
    setError('')
  }, [resumeDraft])

  function updateField(field: keyof ApplicationFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }))
  }

  async function refreshApplication(): Promise<void> {
    if (!application || !accessKey) return
    const updated = await apiRequest<ApplicantApplication>(`/applications/${application.id}/status`, { token: accessKey })
    setApplication(updated)
  }

  async function saveDraft(): Promise<void> {
    setError('')
    setBusy(true)
    try {
      if (application) {
        const response = await apiRequest<{ application: ApplicantApplication }>(`/applications/${application.id}/draft`, {
          method: 'PATCH',
          token: accessKey,
          body: {
            ...fields,
            programme_id: fields.programme_id ? Number(fields.programme_id) : undefined,
            date_of_birth: fields.date_of_birth || null,
          },
        })
        setApplication(response.application)
      } else {
        if (!fields.programme_id) throw new Error('Choose a programme before saving your application.')
        const response = await apiRequest<{ application: ApplicantApplication; access_key: string }>('/applications/drafts', {
          method: 'POST',
          body: {
            programme_id: Number(fields.programme_id),
            applicant_name: fields.applicant_name,
            email: fields.email,
            phone: fields.phone,
          },
        })
        setApplication(response.application)
        setAccessKey(response.access_key)
      }
      void notifySuccess('Your application draft has been saved.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Your draft could not be saved.'
      setError(message)
      void notifyError('Your draft could not be saved', message)
      throw saveError
    } finally {
      setBusy(false)
    }
  }

  async function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await saveDraft()
      setError('')
      setStep((current) => Math.min(current + 1, 3))
    } catch {
      // The error is shown beside the form; keep the applicant on this step.
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!application) return
    if (!await confirmAction('Submit your application?', 'Please check your details before sending them to OCMC Admissions.', 'Submit application')) return
    setError('')
    setBusy(true)
    try {
      await apiRequest(`/applications/${application.id}/submit`, {
        method: 'POST',
        token: accessKey,
        body: {
          ...fields,
          programme_id: Number(fields.programme_id),
          privacy_consent: privacyConsent,
        },
      })
      await refreshApplication()
      setStep(3)
      void notifySuccess('Your application has been submitted.')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Your application could not be submitted.'
      setError(message)
      void notifyError('Application submission failed', message)
    } finally {
      setBusy(false)
    }
  }

  async function copyAccessKey() {
    try {
      await navigator.clipboard.writeText(accessKey)
      setKeyCopied(true)
      void notifySuccess('Your private access key was copied.')
    } catch {
      setError('Clipboard unavailable. Copy the access key shown above and keep it safe.')
      void notifyError('Could not copy access key', 'Clipboard access is unavailable. Copy the key shown on the page and keep it safe.')
    }
  }

  const saveButton = <button type="button" disabled={busy || Boolean(catalogueError)} onClick={() => void saveDraft().catch(() => undefined)} className="border border-navy px-5 py-3 text-sm font-bold text-navy hover:bg-cream disabled:opacity-50">{busy ? 'Saving…' : 'Save draft'}</button>

  return <div className="mt-8 max-w-3xl">
    {catalogueError && <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">Programme choices are unavailable: {catalogueError}</p>}
    {application && accessKey && <div className="mb-5 border border-gold/50 bg-cream p-4">
      <p className="text-sm font-bold text-navy">Your private application access key</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">Keep this key with your reference. It gives access to this application, so don’t share it with anyone else.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="max-w-full break-all text-xs text-navy">{accessKey}</code>
        <button type="button" onClick={() => void copyAccessKey()} className="shrink-0 border border-navy px-3 py-2 text-xs font-bold text-navy">{keyCopied ? 'Copied' : 'Copy key'}</button>
      </div>
    </div>}
    {application && <ApplicantStatusPanel application={application} accessKey={accessKey} onRefresh={refreshApplication} />}
    {error && <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {(!application || application.status === 'draft') && <>
      <ol aria-label="Application steps" className="mb-5 grid grid-cols-4 gap-2">
        {['Your details', 'Education', 'Documents', 'Review'].map((label, index) => <li key={label} className={`border-t-2 pt-2 text-[10px] font-semibold sm:text-xs ${step >= index ? 'border-gold text-navy' : 'border-slate-200 text-slate-400'}`} aria-current={step === index ? 'step' : undefined}>{index + 1}. {label}</li>)}
      </ol>
      {step === 0 && <form onSubmit={nextStep} className="space-y-5 border border-slate-200 p-5 sm:p-8">
        <h3 className="font-display text-2xl text-navy">Let’s start with you.</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">Full name<input required name="applicant_name" value={fields.applicant_name} onChange={(event) => updateField('applicant_name', event.target.value)} autoComplete="name" maxLength={255} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm outline-none focus:border-gold" /></label>
          <label className="block text-xs font-semibold text-slate-700">Email address<input required name="email" type="email" value={fields.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" maxLength={255} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm outline-none focus:border-gold" /></label>
          <label className="block text-xs font-semibold text-slate-700">Phone number<input required name="phone" type="tel" value={fields.phone} onChange={(event) => updateField('phone', event.target.value)} autoComplete="tel" maxLength={40} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm outline-none focus:border-gold" /></label>
          <label className="block text-xs font-semibold text-slate-700">Programme
            <select required name="programme_id" value={fields.programme_id} onChange={(event) => updateField('programme_id', event.target.value)} disabled={catalogue.length === 0} className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm disabled:bg-slate-50">
              <option value="" disabled>Select a programme</option>
              {catalogue.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">{saveButton}<button disabled={busy || catalogue.length === 0} className="inline-flex items-center gap-2 bg-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save and continue'} <ArrowRight size={15} /></button></div>
      </form>}
      {step === 1 && <form onSubmit={nextStep} className="space-y-5 border border-slate-200 p-5 sm:p-8">
        <h3 className="font-display text-2xl text-navy">A little about your background.</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">Date of birth<input required type="date" max={new Date().toISOString().slice(0, 10)} value={fields.date_of_birth} onChange={(event) => updateField('date_of_birth', event.target.value)} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
          <label className="block text-xs font-semibold text-slate-700">Nationality<input required maxLength={100} value={fields.nationality} onChange={(event) => updateField('nationality', event.target.value)} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">Residential address<input required maxLength={255} value={fields.address} onChange={(event) => updateField('address', event.target.value)} autoComplete="street-address" className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-700">Previous education<textarea required maxLength={10000} rows={3} value={fields.previous_education} onChange={(event) => updateField('previous_education', event.target.value)} placeholder="Schools attended, qualifications and completion years" className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-700">Personal statement <span className="font-normal text-slate-500">(at least 50 characters)</span><textarea required minLength={50} maxLength={10000} rows={5} value={fields.personal_statement} onChange={(event) => updateField('personal_statement', event.target.value)} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
        <div className="flex flex-wrap gap-3">{saveButton}<button type="button" onClick={() => setStep(0)} className="border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Back</button><button disabled={busy} className="inline-flex items-center gap-2 bg-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save and continue'} <ArrowRight size={15} /></button></div>
      </form>}
      {step === 2 && application && <div className="border border-slate-200 p-5 sm:p-8">
        <h3 className="font-display text-2xl text-navy">Add your supporting documents.</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Upload an academic transcript and a valid identity document before submitting. PDF, JPG and PNG files up to 10 MB are accepted and stored privately.</p>
        <ApplicantDocumentUploader application={application} accessKey={accessKey} onUploaded={async (document) => {
          setApplication((current) => current
            ? { ...current, documents: [...current.documents.filter((uploaded) => uploaded.id !== document.id), document] }
            : current)
          await refreshApplication()
        }} />
        <div className="mt-6 flex flex-wrap gap-3">{saveButton}<button type="button" onClick={() => setStep(1)} className="border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Back</button><button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 bg-navy px-5 py-3 text-sm font-bold text-white">Review application <ArrowRight size={15} /></button></div>
      </div>}
      {step === 3 && application && application.status === 'draft' && <form onSubmit={submitApplication} className="space-y-5 border border-slate-200 p-5 sm:p-8">
        <h3 className="font-display text-2xl text-navy">Review and submit.</h3>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Applicant</dt><dd className="font-semibold text-navy">{fields.applicant_name}</dd></div>
          <div><dt className="text-xs text-slate-500">Email</dt><dd className="font-semibold text-navy">{fields.email}</dd></div>
          <div><dt className="text-xs text-slate-500">Programme</dt><dd className="font-semibold text-navy">{catalogue.find((item) => String(item.id) === fields.programme_id)?.name}</dd></div>
          <div><dt className="text-xs text-slate-500">Documents uploaded</dt><dd className="font-semibold text-navy">{application.documents.length}</dd></div>
        </dl>
        <label className="flex items-start gap-3 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} required className="mt-1 accent-[#C9A458]" /><span>I confirm the information is accurate and consent to OCMC processing my application information for admissions.</span></label>
        <div className="flex flex-wrap gap-3">{saveButton}<button type="button" onClick={() => setStep(2)} className="border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Back to documents</button><button disabled={busy} className="inline-flex items-center gap-2 bg-gold px-5 py-3 text-sm font-bold text-navy disabled:opacity-50">{busy ? 'Submitting…' : 'Submit application'} <ArrowRight size={15} /></button></div>
      </form>}
    </>}
  </div>
}

function TrackApplicationForm({ onResumeDraft }: {
  onResumeDraft: (application: ApplicantApplication, accessKey: string) => void
}) {
  const [application, setApplication] = useState<ApplicantApplication | null>(null)
  const [reference, setReference] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await apiRequest<ApplicantApplication>('/applications/track', {
        method: 'POST',
        body: { reference, access_key: accessKey },
      })
      setApplication(result)
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : 'Application could not be found.')
    } finally {
      setLoading(false)
    }
  }

  async function refresh(): Promise<void> {
    if (!application || !accessKey) return
    const updated = await apiRequest<ApplicantApplication>(`/applications/${application.id}/status`, { token: accessKey })
    setApplication(updated)
  }

  return <section className="mt-14 border-t border-slate-200 pt-10">
    <div className="max-w-3xl"><SectionHeading eyebrow="Already started?" title="Track or resume an application." description="Enter your application reference and private access key. Your reference alone cannot reveal your application." />
      <form onSubmit={track} className="mt-6 grid gap-4 border border-slate-200 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {error && <p role="alert" className="text-sm text-red-700 sm:col-span-3">{error}</p>}
        <label className="block text-xs font-semibold text-slate-700">Application reference<input required value={reference} onChange={(event) => setReference(event.target.value)} autoComplete="off" className="mt-2 block w-full border border-slate-200 px-3 py-3 font-mono text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-700">Private access key<input required value={accessKey} onChange={(event) => setAccessKey(event.target.value)} autoComplete="off" className="mt-2 block w-full border border-slate-200 px-3 py-3 font-mono text-sm" /></label>
        <button disabled={loading} className="bg-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Checking…' : 'Track application'}</button>
      </form>
      {application && <ApplicantStatusPanel application={application} accessKey={accessKey} onRefresh={refresh} />}
      {application?.status === 'draft' && <button type="button" onClick={() => onResumeDraft(application, accessKey)} className="mt-4 bg-gold px-5 py-3 text-sm font-bold text-navy hover:bg-[#d7b66f]">Continue editing this draft</button>}
    </div>
  </section>
}

type StaffApplication = ApplicantApplication & {
  review_notes: string | null
  assigned_officer: { id: number; name: string } | null
}

export function StaffAdmissionsPage() {
  const [token] = useState(() => sessionStorage.getItem('ocmc_access_token') ?? '')
  const [roles] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ocmc_roles') ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const [applications, setApplications] = useState<StaffApplication[]>([])
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshCount, setRefreshCount] = useState(0)
  const [totalApplications, setTotalApplications] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Sign in with an Admissions Officer, Registrar or Super Administrator account to review applications.')
      setLoading(false)
      return
    }
    let active = true
    const query = new URLSearchParams({ page: String(page) })
    if (statusFilter) query.set('status', statusFilter)
    if (search) query.set('search', search)
    setError('')
    setLoading(true)
    apiRequest<Paginated<StaffApplication>>(`/manage/applications?${query.toString()}`, { token })
      .then((response) => {
        if (!active) return
        setApplications(response.data)
        setTotalApplications(response.total)
        setLastPage(response.last_page)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Admissions applications could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token, statusFilter, search, page, refreshCount])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchText.trim())
  }

  function refreshApplications() {
    setRefreshCount((count) => count + 1)
  }

  async function download(document: StaffApplication['documents'][number], applicationId: number) {
    try {
      await downloadProtectedFile(
        `/manage/applications/${applicationId}/documents/${document.id}/download`,
        token,
        document.original_name,
      )
      void notifySuccess(`${document.original_name} downloaded.`)
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'Document download failed.'
      setError(message)
      void notifyError('Document download failed', message)
    }
  }

  return <>
    <PageHero eyebrow="Staff workspace" title="Admissions review." description="Review applicant information and private supporting documents, request further evidence, and record admissions decisions." />
    <section className="container-width py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <SectionHeading eyebrow="Admissions applications" title="Review applications." description="All actions are checked against your assigned server-side permissions." />
        <label className="block text-xs font-semibold text-slate-700">Filter by status
          <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value) }} className="mt-2 block min-w-56 border border-slate-200 bg-white px-3 py-3 text-sm">
            <option value="">All statuses</option>
            {['draft', 'submitted', 'under_review', 'additional_documents_requested', 'accepted', 'rejected'].map((status) => <option key={status} value={status}>{formatApplicationStatus(status)}</option>)}
          </select>
        </label>
      </div>
      <form onSubmit={applySearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="admissions-search" className="sr-only">Search by application reference, applicant name or email</label>
        <input id="admissions-search" type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search reference, applicant or email" className="min-w-0 flex-1 border border-slate-200 px-4 py-3 text-sm" />
        <button className="bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-[#142b4d]">Search applications</button>
        {search && <button type="button" onClick={() => { setSearchText(''); setSearch(''); setPage(1) }} className="border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Clear</button>}
      </form>
      {!error && <p aria-live="polite" className="mt-4 text-sm text-slate-500">{totalApplications} application{totalApplications === 1 ? '' : 's'} found</p>}
      {error && <p role="alert" className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading && <p className="mt-8 text-sm text-slate-500">Loading applications…</p>}
      {!loading && !error && applications.length === 0 && <p className="mt-8 border border-slate-200 p-6 text-sm text-slate-600">{search || statusFilter ? 'No applications match these filters.' : 'No applications have been received yet.'}</p>}
      <div className="mt-8 space-y-6">
        {applications.map((application) => <StaffApplicationCard key={application.id} application={application} token={token} canManage={roles.includes('Admissions Officer') || roles.includes('Super Administrator')} onSaved={refreshApplications} onDownload={download} />)}
      </div>
      {!loading && lastPage > 1 && <nav aria-label="Admissions application pages" className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border border-slate-200 px-4 py-2 text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        <span aria-live="polite" className="text-sm text-slate-600">Page {page} of {lastPage}</span>
        <button type="button" disabled={page >= lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))} className="border border-slate-200 px-4 py-2 text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </nav>}
    </section>
  </>
}

function StaffApplicationCard({
  application,
  token,
  canManage,
  onSaved,
  onDownload,
}: {
  application: StaffApplication
  token: string
  canManage: boolean
  onSaved: () => void
  onDownload: (document: StaffApplication['documents'][number], applicationId: number) => Promise<void>
}) {
  const [status, setStatus] = useState('under_review')
  const [reviewNotes, setReviewNotes] = useState('')
  const [applicantMessage, setApplicantMessage] = useState('')
  const [requestedTypes, setRequestedTypes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isFinal = ['accepted', 'rejected'].includes(application.status)
  const documentTypes = ['academic_transcript', 'identity_document', 'proof_of_results', 'personal_statement', 'other']

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const decision = formatApplicationStatus(status).toLowerCase()
    if (!await confirmAction('Save this admissions review?', `This will ${decision} the application and notify the applicant when a message is included.`, 'Save review')) return
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/manage/applications/${application.id}`, {
        method: 'PATCH',
        token,
        body: {
          status,
          applicant_message: applicantMessage,
          review_notes: reviewNotes || null,
          ...(status === 'additional_documents_requested' ? { requested_document_types: requestedTypes } : {}),
        },
      })
      onSaved()
      void notifySuccess('Admissions review saved.')
    } catch (reviewError) {
      const message = reviewError instanceof Error ? reviewError.message : 'The review could not be saved.'
      setError(message)
      void notifyError('Admissions review could not be saved', message)
    } finally {
      setSaving(false)
    }
  }

  return <article className="border border-slate-200 p-5 sm:p-7">
    <div className="flex flex-wrap justify-between gap-4">
      <div><p className="font-mono text-sm font-bold text-gold">{application.reference}</p><h2 className="mt-1 font-display text-2xl text-navy">{application.applicant_name}</h2><p className="mt-1 text-sm text-slate-600">{application.email} · {application.phone}</p></div>
      <span className="h-fit bg-cream px-3 py-2 text-xs font-bold uppercase text-navy">{formatApplicationStatus(application.status)}</span>
    </div>
    <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-slate-500">Programme</dt><dd className="font-semibold text-navy">{application.programme?.name}</dd></div>
      <div><dt className="text-xs text-slate-500">Submitted</dt><dd className="font-semibold text-navy">{application.submitted_at ? new Date(application.submitted_at).toLocaleString() : 'Not submitted'}</dd></div>
      <div><dt className="text-xs text-slate-500">Date of birth / nationality</dt><dd className="font-semibold text-navy">{application.date_of_birth ?? '—'} / {application.nationality ?? '—'}</dd></div>
      <div><dt className="text-xs text-slate-500">Previous education</dt><dd className="font-semibold text-navy">{application.previous_education ?? '—'}</dd></div>
    </dl>
    {application.personal_statement && <div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Personal statement</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{application.personal_statement}</p></div>}
    <div className="mt-5">
      <h3 className="font-semibold text-navy">Private supporting documents</h3>
      {application.documents.length === 0 && <p className="mt-2 text-sm text-slate-500">No documents uploaded.</p>}
      <ul className="mt-2 space-y-2">{application.documents.map((document) => <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
        <span>{documentLabels[document.document_type] ?? document.document_type}: {document.original_name}</span>
        <button type="button" onClick={() => void onDownload(document, application.id)} className="text-xs font-bold text-navy underline hover:text-gold">Download privately</button>
      </li>)}</ul>
    </div>
    {application.review_notes && <p className="mt-4 bg-slate-50 p-3 text-sm text-slate-600"><strong>Previous internal notes:</strong> {application.review_notes}</p>}
    {canManage && !isFinal && application.status !== 'draft' && <form onSubmit={review} className="mt-6 space-y-4 border-t border-slate-200 pt-5">
      <h3 className="font-display text-xl text-navy">Record a review decision</h3>
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <label className="block text-xs font-semibold text-slate-700">Action
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm">
          <option value="under_review">Move to under review</option>
          <option value="additional_documents_requested">Request additional documents</option>
          <option value="accepted">Accept application</option>
          <option value="rejected">Reject application</option>
        </select>
      </label>
      {status === 'additional_documents_requested' && <fieldset className="space-y-2"><legend className="text-xs font-semibold text-slate-700">Documents requested</legend>{documentTypes.map((type) => <label key={type} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={requestedTypes.includes(type)} onChange={(event) => setRequestedTypes((current) => event.target.checked ? [...current, type] : current.filter((value) => value !== type))} />{documentLabels[type]}</label>)}</fieldset>}
      <label className="block text-xs font-semibold text-slate-700">Message to applicant<textarea required maxLength={2000} rows={3} value={applicantMessage} onChange={(event) => setApplicantMessage(event.target.value)} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="block text-xs font-semibold text-slate-700">Internal review notes (not shared with applicant)<textarea maxLength={10000} rows={2} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} className="mt-2 block w-full border border-slate-200 px-3 py-3 text-sm" /></label>
      <button disabled={saving} className="bg-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving review…' : 'Save review and notify applicant'}</button>
    </form>}
  </article>
}

export function AdmissionsPage() {
  const [catalogue, setCatalogue] = useState<ApiProgramme[]>([])
  const [catalogueError, setCatalogueError] = useState('')
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('')
  const [resumeDraft, setResumeDraft] = useState<{ application: ApplicantApplication; accessKey: string } | null>(null)
  const applicationSection = useRef<HTMLElement | null>(null)
  useEffect(() => {
    apiRequest<Paginated<ApiProgramme>>('/programmes')
      .then((response) => setCatalogue(response.data))
      .catch((error: unknown) => setCatalogueError(error instanceof Error ? error.message : 'Could not load programmes.'))
  }, [])
  function chooseProgramme(programmeId: number) {
    setSelectedProgrammeId(String(programmeId))
    applicationSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function resumeApplication(application: ApplicantApplication, accessKey: string) {
    setResumeDraft({ application, accessKey })
    applicationSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return <>
    <PageHero eyebrow="Admissions at OCMC" title="Your next chapter starts here." description="We’re glad you’re considering OCMC. Find out how to apply, what to prepare and where to get support along the way." image="/images/student-campus-portrait.jpg" />
    <section className="container-width py-14 lg:py-20"><SectionHeading eyebrow="The application journey" title="Four steps to get started." description="Take it one step at a time. Our admissions team is here to help if you have questions." /><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[
      ['01', 'Choose your programme', 'Explore your options and find the course that matches your interests and goals.'],
      ['02', 'Prepare your documents', 'Gather your academic certificates, identification and any programme-specific documents.'],
      ['03', 'Submit your application', 'Complete an application form and share your supporting documents with the admissions team.'],
      ['04', 'Hear from our team', 'We’ll be in touch to talk through your application and explain the next steps.'],
    ].map(([num, title, text]) => <article key={num} className="border-t-2 border-gold bg-cream p-5"><span className="font-display text-3xl text-gold">{num}</span><h2 className="mt-4 font-display text-2xl text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></section>
    <AdmissionsProgrammePicker programmes={catalogue} catalogueError={catalogueError} selectedProgrammeId={selectedProgrammeId} onSelect={chooseProgramme} />
    <section ref={applicationSection} className="container-width scroll-mt-8 py-14 lg:py-20">
      <SectionHeading eyebrow="Apply to OCMC" title="Start your application." description="Complete the form and our admissions team will be in touch using the details you provide. For privacy, applications are never automatically reopened in this browser; use your reference and private key below to resume a draft." />
      <ApplicationForm programmes={catalogue} catalogueError={catalogueError} initialProgrammeId={selectedProgrammeId} resumeDraft={resumeDraft} />
      <TrackApplicationForm onResumeDraft={resumeApplication} />
    </section>
    <section className="bg-cream py-14 lg:py-20"><div className="container-width grid gap-10 lg:grid-cols-[1fr_.8fr]"><div><SectionHeading eyebrow="What you’ll need" title="A few things to have ready." description="Requirements can vary depending on your programme and qualifications. Our team can help you confirm what applies to you." /><ul className="mt-7 space-y-4">{['Academic certificates and transcripts', 'A valid form of identification', 'A completed application form', 'Any additional documents requested for your programme'].map((text) => <li key={text} className="flex gap-3 text-sm text-slate-700"><Check size={17} className="mt-0.5 shrink-0 text-gold" />{text}</li>)}</ul></div><aside className="bg-navy p-7 text-white sm:p-9"><GraduationCap className="text-gold" size={32} /><h2 className="mt-5 font-display text-3xl">Let’s talk about your plans.</h2><p className="mt-3 text-sm leading-6 text-white/70">Have a question about entry requirements, fees or the application process? We’d be happy to hear from you.</p><a href="mailto:admissions@ocmc.edu.gh" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-white">admissions@ocmc.edu.gh <ArrowUpRight size={15} /></a><Link to="/contact" className="mt-5 flex items-center justify-between border-t border-white/15 pt-5 text-sm font-bold">Contact admissions <ArrowRight size={16} /></Link></aside></div></section>
    <section className="container-width py-14 text-center"><p className="eyebrow justify-center">Take the first step</p><h2 className="mt-3 font-display text-3xl text-navy sm:text-4xl">A future full of possibility is waiting.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Reach out to our team for current application information and guidance tailored to you.</p><Link to="/contact" className="mt-6 inline-flex items-center gap-2 bg-gold px-6 py-3.5 text-sm font-bold text-navy hover:bg-[#d7b66f]">Enquire now <ArrowRight size={16} /></Link></section>
  </>
}

export function FacilitiesPage() {
  const spaces = [
    ['Learning spaces', 'Flexible classrooms and seminar spaces designed to make collaboration, discussion and discovery part of every day.', '/images/student-computer-lab.jpg'],
    ['Library & study', 'A welcoming place to find your focus, access learning resources and work alongside fellow students.', '/images/library-study-pair.jpg'],
    ['Campus community', 'Shared spaces to meet, recharge and make the connections that turn a college into a community.', '/images/campus-community-group.jpg'],
  ]
  return <>
    <PageHero eyebrow="Life at OCMC" title="Space to learn. Room to grow." description="Discover welcoming places to focus, collaborate and connect as you make the most of your time at college." image="/images/library-study-pair.jpg" />
    <section className="container-width py-14 lg:py-20"><SectionHeading eyebrow="Our campus" title="Made for learning, made for you." description="From focused study to collaborative projects, our campus spaces support the way students learn and live together." /><div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">{spaces.map(([title, text, image]) => <article key={title}><img src={image} alt={title} loading="lazy" className="h-56 w-full object-cover" /><h2 className="mt-5 font-display text-2xl text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></section>
    <section className="bg-cream py-14 lg:py-20"><div className="container-width grid gap-10 lg:grid-cols-2 lg:items-center"><img src="/images/international-study-group.jpg" alt="International classmates working through a project together" loading="lazy" className="h-[360px] w-full object-cover" /><div><SectionHeading eyebrow="A place to belong" title="The best learning happens together." /><p className="mt-5 leading-7 text-slate-600">Our campus is more than a collection of rooms. It’s a shared environment where students can exchange ideas, ask questions and find support as they take on new challenges.</p><Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Ask us about campus <ArrowRight size={16} /></Link></div></div></section>
  </>
}

export function StudentLifePage() {
  const supportTopics = [
    {
      question: 'How do I get help with my studies?',
      answer: 'Start with your lecturer or programme contact. They can point you to the right academic guidance and learning resources for your course.',
    },
    {
      question: 'Where can I find my timetable, results and fee statements?',
      answer: 'Sign in to the student portal. Your dashboard only displays information linked to your own student record and published by OCMC.',
    },
    {
      question: 'How can I ask about student activities or campus support?',
      answer: 'Contact the college team with your question and they will direct you to the appropriate OCMC contact.',
    },
    {
      question: 'I am an international student. Where should I begin?',
      answer: 'Contact OCMC before making travel or study arrangements so the team can advise you on current admissions requirements and the information relevant to your situation.',
    },
  ]

  return <>
    <PageHero eyebrow="Life at OCMC" title="Find your people. Find your path." description="College life is built in and beyond the classroom. Discover ways to learn with others, explore your interests and get connected to the right support." image="/images/campus-community-group.jpg" />
    <section className="container-width py-14 lg:py-20">
      <SectionHeading eyebrow="A community to grow in" title="Make your time here count." description="From shared study to new friendships, a strong campus community helps students feel connected while they work toward their goals." />
      <div className="mt-9 grid gap-6 md:grid-cols-3">
        {campusStories.map((story) => <article key={story.title} className="interactive-card overflow-hidden border border-slate-200 bg-white">
          <img src={story.image} alt={story.alt} loading="lazy" className="h-56 w-full object-cover" />
          <div className="p-5"><h2 className="font-display text-2xl text-navy">{story.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{story.description}</p></div>
        </article>)}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link to="/facilities" className="flex items-center justify-between border border-slate-200 p-5 text-sm font-bold text-navy transition hover:border-gold hover:bg-cream">Explore campus spaces <ArrowRight size={17} /></Link>
        <Link to="/programmes" className="flex items-center justify-between border border-slate-200 p-5 text-sm font-bold text-navy transition hover:border-gold hover:bg-cream">Find a programme <ArrowRight size={17} /></Link>
      </div>
    </section>
    <section className="bg-cream py-14 lg:py-20" aria-labelledby="student-support-title">
      <div className="container-width grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Student support</p>
          <h2 id="student-support-title" className="mt-3 font-display text-3xl text-navy sm:text-4xl">Know where to start.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">Whether you are planning to apply or already studying, use these practical starting points to reach the right OCMC service.</p>
          <Link to="/contact" className="mt-6 inline-flex items-center gap-2 bg-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-[#142b4d]">Contact the college <ArrowRight size={16} /></Link>
          <Link to="/login" className="mt-3 flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Open the student portal <ArrowRight size={16} /></Link>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {supportTopics.map((topic) => <details key={topic.question} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
              {topic.question}<span aria-hidden="true" className="text-xl text-gold group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{topic.answer}</p>
          </details>)}
        </div>
      </div>
    </section>
    <section className="container-width py-14 text-center lg:py-20">
      <p className="eyebrow justify-center">Your next chapter</p>
      <h2 className="mt-3 font-display text-3xl text-navy sm:text-4xl">Ready to take the next step?</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/admissions" className="inline-flex items-center gap-2 bg-gold px-5 py-3 text-sm font-bold text-navy hover:bg-[#d7b66f]">Explore admissions <ArrowRight size={16} /></Link>
        <Link to="/contact" className="inline-flex items-center gap-2 border border-navy px-5 py-3 text-sm font-bold text-navy hover:bg-cream">Ask us a question <ArrowRight size={16} /></Link>
      </div>
    </section>
  </>
}

export function AlumniPage() {
  return <>
    <PageHero eyebrow="The OCMC community" title="A connection that goes further." description="Your OCMC journey doesn’t end at graduation. Join a growing community of people learning, leading and making a difference." image="/images/student-portrait.jpg" imageFit="contain" />
    <section className="container-width grid gap-12 py-14 lg:grid-cols-2 lg:items-center lg:py-20"><div><SectionHeading eyebrow="Once OCMC, always OCMC" title="Your community is with you." /><p className="mt-5 leading-7 text-slate-600">Our alumni are an important part of the OCMC story. They bring their experience back to our community, open doors for the next generation and keep building new connections long after graduation.</p><p className="mt-4 leading-7 text-slate-600">Whether you graduated recently or many years ago, there’s a place for you here — to reconnect, share what you’ve learned and celebrate what comes next.</p><Link to="/contact" className="mt-7 inline-flex items-center gap-2 bg-navy px-6 py-3.5 text-sm font-bold text-white hover:bg-[#142b4d]">Connect with OCMC <ArrowRight size={16} /></Link></div><img src="/images/diverse-students-campus.png" alt="Four OCMC students smiling together on campus" loading="lazy" className="h-[420px] w-full bg-cream object-contain sm:h-[500px]" /></section>
    <section className="bg-cream py-14 lg:py-20"><div className="container-width"><SectionHeading eyebrow="Stay part of the story" title="Ways to stay connected." centered /><div className="mt-10 grid gap-5 md:grid-cols-3">{[['Reconnect', 'Catch up with classmates, lecturers and friends who made your time at OCMC special.'], ['Share your journey', 'Tell current students about your experience and the path you’ve taken since graduating.'], ['Give back', 'Support the next generation with your time, advice or professional connections.']].map(([title, text]) => <article key={title} className="interactive-card bg-white p-6"><UsersRound className="text-gold" size={24} /><h3 className="mt-4 font-display text-2xl text-navy">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>
    <section className="container-width py-14 text-center lg:py-20"><Award className="mx-auto text-gold" size={32} /><p className="mt-4 font-display text-3xl text-navy">Your story is part of ours.</p><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">We’d love to hear where life has taken you. Get in touch and help us grow the OCMC alumni community.</p><Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Say hello <ArrowRight size={16} /></Link></section>
  </>
}

export function NewsPage() {
  return <>
    <PageHero eyebrow="Stories from OCMC" title="Good things are happening here." description="The ideas, achievements and everyday moments that make our college community what it is." image="/images/international-study-group.jpg" />
    <section className="container-width py-14 lg:py-20"><SectionHeading eyebrow="The latest" title="Life, learning and what’s next." description="Catch up on recent stories from across the OCMC community." /><div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">{newsItems.map((item) => <article key={item.title} className="group"><Link to="/news" className="block overflow-hidden"><img src={item.image} alt={item.imageAlt ?? ''} loading="lazy" className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" /></Link><p className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gold"><span>{item.category}</span><span className="text-slate-300">·</span><CalendarDays size={12} /><span>{item.date}</span></p><h2 className="mt-2 font-display text-2xl leading-snug text-navy"><Link to="/news" className="hover:text-gold">{item.title}</Link></h2><p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p><Link to="/news" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-gold">Read story <ArrowRight size={13} /></Link></article>)}</div></section>
    <section className="bg-cream py-14"><div className="container-width flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><p className="eyebrow">Stay in the loop</p><h2 className="mt-2 font-display text-3xl text-navy">There’s always more to discover.</h2></div><Link to="/contact" className="inline-flex items-center gap-2 bg-navy px-6 py-3.5 text-sm font-bold text-white hover:bg-[#142b4d]">Get in touch <ArrowRight size={16} /></Link></div></section>
  </>
}

function ContactForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSent(false)
    setError('')
    setSubmitting(true)
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      await apiRequest('/enquiries', {
        method: 'POST',
        body: {
          first_name: values.get('firstName'),
          last_name: values.get('lastName'),
          email: values.get('email'),
          interest: values.get('interest') || 'general',
          message: values.get('message'),
        },
      })
      setSent(true)
      form.reset()
      void notifySuccess('Your message has been received.')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Your message could not be sent.'
      setError(message)
      void notifyError('Your message could not be sent', message)
    } finally {
      setSubmitting(false)
    }
  }
  return <form onSubmit={handleSubmit} className="space-y-4">
    {sent && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-800">Thank you for your message. Your enquiry has been received.</p>}
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-xs font-semibold text-slate-700">First name<input required name="firstName" autoComplete="given-name" className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-gold" /></label>
      <label className="block text-xs font-semibold text-slate-700">Last name<input required name="lastName" autoComplete="family-name" className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-gold" /></label>
    </div>
    <label className="block text-xs font-semibold text-slate-700">Email address<input required name="email" type="email" autoComplete="email" className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-gold" /></label>
    <label className="block text-xs font-semibold text-slate-700">I’m interested in<select name="interest" defaultValue="general" className="mt-2 block w-full border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-gold"><option value="general">General enquiry</option><option value="admissions">Admissions</option><option value="programmes">Programmes</option><option value="alumni">Alumni</option></select></label>
    <label className="block text-xs font-semibold text-slate-700">Your message<textarea required name="message" rows={4} className="mt-2 block w-full resize-y border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-gold" /></label>
    <button disabled={submitting} className="inline-flex items-center gap-2 bg-navy px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#142b4d] disabled:cursor-wait disabled:opacity-50" type="submit">{submitting ? 'Sending…' : 'Send message'} <ArrowRight size={15} /></button>
  </form>
}

export function ContactPage() {
  return <>
    <PageHero eyebrow="We’re here to help" title="Let’s start a conversation." description="Questions about studying at OCMC, a programme or campus life? Our team would love to hear from you." image="/images/student-discussion.png" />
    <section className="container-width grid gap-12 py-14 lg:grid-cols-[.75fr_1.25fr] lg:py-20">
      <div><SectionHeading eyebrow="Get in touch" title="We’d love to hear from you." description="Reach out using the form, or connect directly with our team." /><div className="mt-8 space-y-6">
        <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-cream text-gold"><MapPin size={19} /></span><div><h2 className="text-sm font-bold text-navy">Visit us</h2><p className="mt-1 text-sm leading-6 text-slate-600">Oxford School of Communication<br />&amp; Media College, Ghana</p></div></div>
        <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-cream text-gold"><BookOpen size={19} /></span><div><h2 className="text-sm font-bold text-navy">Admissions enquiries</h2><a href="mailto:admissions@ocmc.edu.gh" className="mt-1 block text-sm text-slate-600 hover:text-gold">admissions@ocmc.edu.gh</a></div></div>
        <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-cream text-gold"><Clock3 size={19} /></span><div><h2 className="text-sm font-bold text-navy">Call our team</h2><a href="tel:+233302000000" className="mt-1 block text-sm text-slate-600 hover:text-gold">+233 (0) 30 200 0000</a></div></div>
      </div></div>
      <div className="interactive-card bg-cream p-5 sm:p-8"><h2 className="mb-6 font-display text-3xl text-navy">Send us a message</h2><ContactForm /></div>
    </section>
  </>
}

const portalRoles = [
  { name: 'Super Administrator', dashboard: 'Institution administration', access: 'Manage authorized users, roles, programmes, courses, staff, students and applications.' },
  { name: 'Admissions Officer', dashboard: 'Admissions workspace', access: 'Review applications, request documents and record applicant decisions.' },
  { name: 'Registrar', dashboard: 'Registry & academic administration', access: 'Manage student records, courses, staff records and grade approvals.' },
  { name: 'Finance Officer', dashboard: 'Finance workspace', access: 'A protected finance dashboard entry is available; detailed finance tools are not yet implemented.' },
  { name: 'Lecturer', dashboard: 'Teaching workspace', access: 'Manage assigned courses, attendance, learning materials and grade submissions.' },
  { name: 'Student', dashboard: 'Student portal', access: 'View your own student profile, timetable, registrations, approved results and fee statements.' },
  { name: 'Alumni', dashboard: 'Alumni portal', access: 'Access the OCMC alumni area and connect with the college community.' },
]

export function PortalsPage() {
  return <>
    <PageHero eyebrow="OCMC account access" title="The right workspace for your role." description="OCMC portals use one secure sign-in. After you sign in, your assigned role determines which dashboard and records you can access." image="/images/international-study-group.jpg" />
    <section className="container-width py-14 lg:py-20">
      <div className="max-w-3xl">
        <SectionHeading eyebrow="Role-based dashboards" title="Find your OCMC portal." description="Dashboard access is assigned by authorized college staff. A student or staff account only sees the functions allowed for its role." />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portalRoles.map((role) => <article key={role.name} className="flex h-full flex-col border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-gold/60 hover:shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{role.name}</p>
          <h2 className="mt-2 font-display text-2xl text-navy">{role.dashboard}</h2>
          <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{role.access}</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-bold text-navy hover:text-gold">
            Sign in to continue <ArrowRight size={15} />
          </Link>
        </article>)}
      </div>
      <div className="mt-10 grid gap-6 border border-gold/40 bg-cream p-6 sm:grid-cols-2 sm:p-8">
        <div><h2 className="font-display text-2xl text-navy">New student?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Student accounts are created by authorized OCMC staff. The student then receives a private password setup link; there is no public account registration form.</p><Link to="/admissions" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Explore admissions <ArrowRight size={15} /></Link></div>
        <div><h2 className="font-display text-2xl text-navy">Need help signing in?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use the password reset option on the sign-in page or contact the college team for account assistance.</p><div className="mt-4 flex flex-wrap gap-4"><Link to="/login" className="text-sm font-bold text-navy underline underline-offset-4 hover:text-gold">Go to sign in</Link><Link to="/contact" className="text-sm font-bold text-navy underline underline-offset-4 hover:text-gold">Contact OCMC</Link></div></div>
      </div>
    </section>
  </>
}

export function LoginPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [canViewApplications, setCanViewApplications] = useState(false)
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setBusy(true)
    const values = new FormData(event.currentTarget)
    try {
      const response = await apiRequest<{
        token: string
        user: { name: string; roles: Array<{ name: string }> }
      }>('/auth/login', {
        method: 'POST',
        body: {
          identifier: values.get('identifier'),
          password: values.get('password'),
          device_name: 'OCMC website',
        },
      })
      sessionStorage.setItem('ocmc_access_token', response.token)
      const roleNames = response.user.roles.map((role) => role.name)
      sessionStorage.setItem('ocmc_roles', JSON.stringify(roleNames))
      setCanViewApplications(roleNames.some((role) => ['Admissions Officer', 'Registrar', 'Super Administrator'].includes(role)))
      setSignedIn(true)
      setMessage(`Signed in as ${response.user.name}${response.user.roles.length ? ` · ${response.user.roles.map((role) => role.name).join(', ')}` : ''}.`)
      void notifySuccess(`Welcome, ${response.user.name}.`)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Sign-in failed.'
      setError(message)
      void notifyError('Sign-in failed', message)
    } finally {
      setBusy(false)
    }
  }

  async function handleForgotPassword() {
    setMessage('')
    setError('')
    if (!loginIdentifier.includes('@')) {
      setError('Enter the email address registered to your account to request a password reset.')
      return
    }
    setBusy(true)
    try {
      const response = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email: loginIdentifier },
      })
      setMessage(response.message)
      void notifySuccess('If the account is eligible, password reset instructions will be sent.')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Password reset could not be requested.'
      setError(message)
      void notifyError('Password reset could not be requested', message)
    } finally {
      setBusy(false)
    }
  }
  return <section className="page-hero min-h-[650px] py-14 sm:py-20"><div className="container-width grid gap-10 lg:grid-cols-[1fr_.85fr] lg:items-center">
    <div className="max-w-xl text-white"><p className="eyebrow">The OCMC community</p><h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">Your next step,<br /><span className="text-gold">all in one place.</span></h1><p className="mt-5 text-base leading-7 text-white/75">Sign in to the OCMC portal for the dashboard assigned to your student, staff or alumni account.</p><div className="mt-8 flex flex-wrap gap-5 text-xs font-semibold text-white/80"><span className="inline-flex items-center gap-2"><Check size={15} className="text-gold" />One secure sign-in</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-gold" />Role-based access</span></div><Link to="/portals" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-white">See all OCMC dashboards <ArrowRight size={15} /></Link></div>
    <div className="card rounded-0 border-0 shadow-card"><div className="card-body p-4 sm:p-5 md:p-9"><div className="mx-auto max-w-md"><p className="eyebrow">OCMC portal sign in</p><h2 className="mt-3 font-display text-3xl text-navy">Welcome back.</h2><p className="mt-2 text-sm text-slate-600">Use your personal OCMC ID or registered email and password. Your dashboard and records are tied to your own account.</p><form onSubmit={handleSubmit} className="mt-7">
      {message && <p role="status" className="alert alert-success py-2 text-sm leading-5">{message}</p>}
      {error && <p role="alert" className="alert alert-danger py-2 text-sm leading-5">{error}</p>}
      <div className="mb-3"><label htmlFor="portal-identifier" className="form-label text-xs font-semibold text-slate-700">Student ID, staff ID, or email</label><input id="portal-identifier" name="identifier" type="text" required autoComplete="username" placeholder="e.g. OCMC/2026/001 or you@example.com" value={loginIdentifier} onChange={(event) => setLoginIdentifier(event.target.value)} className="form-control rounded-0 py-3 text-sm focus:border-gold focus:shadow-none" /></div>
      <div className="mb-4"><label htmlFor="portal-password" className="form-label text-xs font-semibold text-slate-700">Password</label><div className="input-group"><input id="portal-password" name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" className="form-control rounded-0 py-3 text-sm focus:border-gold focus:shadow-none" /><button type="button" className="btn btn-outline-secondary rounded-0 border-slate-300 px-3 text-slate-600" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}><span className="inline-flex items-center gap-2">{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}<span className="text-xs">{showPassword ? 'Hide' : 'Show'}</span></span></button></div></div>
      <button type="submit" disabled={busy || signedIn} className="btn btn-primary flex w-100 items-center justify-center gap-2 rounded-0 border-0 bg-navy py-3.5 text-sm font-bold text-white hover:bg-[#142b4d] disabled:opacity-50">{busy ? 'Please wait…' : signedIn ? 'Signed in' : 'Sign in'} <ArrowRight size={15} /></button>
    </form>
    <div className="mt-4 text-center">
      <button type="button" onClick={handleForgotPassword} disabled={busy} className="text-xs font-semibold text-navy underline decoration-slate-300 underline-offset-4 hover:text-gold disabled:opacity-50">Forgot your password?</button>
    </div>
    {signedIn && canViewApplications && <Link to="/staff/admissions" className="mt-5 block border border-gold/50 bg-cream px-4 py-3 text-center text-sm font-bold text-navy hover:bg-gold/20">Open admissions review workspace</Link>}
    {signedIn && <Link to="/dashboard" className="mt-3 block bg-gold px-4 py-3 text-center text-sm font-bold text-navy hover:bg-gold/80">Open your role dashboard</Link>}
    <div className="alert alert-light mt-4 rounded-0 border text-xs leading-5 text-slate-600"><strong className="text-navy">Where do I get my OCMC ID?</strong><br />Students receive a student number during admission or registration. Staff receive an employee number from their authorized OCMC administrator. Your account invitation is sent to your registered email, where you set your own password. OCMC staff will never ask you to share it.</div>
    <p className="mt-4 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">Forgot your password? Use the reset option above with your registered email. Need help accessing the portal? <Link to="/contact" className="font-bold text-navy hover:text-gold">Contact OCMC</Link></p></div></div></div>
  </div></section>
}

export function NotFoundPage() {
  return <section className="container-width flex min-h-[55vh] flex-col items-start justify-center py-16"><p className="eyebrow">404 · Page not found</p><h1 className="mt-3 font-display text-5xl text-navy">This page has moved.</h1><p className="mt-4 max-w-lg leading-7 text-slate-600">The page you’re looking for doesn’t exist or may have moved. Let’s get you back on track.</p><Link to="/" className="mt-7 inline-flex items-center gap-2 bg-navy px-6 py-3.5 text-sm font-bold text-white hover:bg-[#142b4d]">Back to home <ChevronRight size={16} /></Link></section>
}
