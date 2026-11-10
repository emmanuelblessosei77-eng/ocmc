import {
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  HeartHandshake,
  Megaphone,
  Monitor,
  type LucideIcon,
} from 'lucide-react'

export type Programme = {
  title: string
  award: string
  duration: string
  description: string
  image: string
  icon: LucideIcon
  category: 'Business' | 'Communication' | 'Technology'
}

export const programmes: Programme[] = [
  {
    title: 'Business Administration',
    award: 'Bachelor of Business Administration',
    duration: '4 years',
    description: 'Build the strategic, financial and people skills to lead organisations with confidence.',
    image: '/images/diverse-students-campus.png',
    icon: BriefcaseBusiness,
    category: 'Business',
  },
  {
    title: 'Marketing & Communication',
    award: 'Bachelor of Arts',
    duration: '4 years',
    description: 'Turn creative ideas into clear messages, meaningful brands and measurable impact.',
    image: '/images/student-discussion.png',
    icon: Megaphone,
    category: 'Communication',
  },
  {
    title: 'Information Technology',
    award: 'Bachelor of Science',
    duration: '4 years',
    description: 'Explore software, networks and digital systems in a hands-on learning environment.',
    image: '/images/student-computer-lab.jpg',
    icon: Monitor,
    category: 'Technology',
  },
  {
    title: 'Human Resource Management',
    award: 'Bachelor of Business Administration',
    duration: '4 years',
    description: 'Learn to build inclusive workplaces and help people and organisations thrive.',
    image: '/images/library-study-pair.jpg',
    icon: HeartHandshake,
    category: 'Business',
  },
  {
    title: 'Accounting & Finance',
    award: 'Bachelor of Business Administration',
    duration: '4 years',
    description: 'Develop practical financial expertise for a changing global business landscape.',
    image: '/images/programme-accounting-finance.jpg',
    icon: ChartNoAxesCombined,
    category: 'Business',
  },
  {
    title: 'General Arts',
    award: 'Bachelor of Arts',
    duration: '4 years',
    description: 'Strengthen critical thinking, research and communication across disciplines.',
    image: '/images/campus-peer-study.png',
    icon: BookOpen,
    category: 'Communication',
  },
]

export const newsItems = [
  {
    category: 'Campus life',
    date: '12 September 2025',
    title: 'A new academic year begins with a week of welcome',
    image: '/images/campus-community.jpg',
    imageAlt: 'OCMC students talking and enjoying time together on campus',
    summary: 'New students found their feet, made new friends and discovered the many ways to get involved at OCMC.',
  },
  {
    category: 'Student success',
    date: '28 August 2025',
    title: 'OCMC students bring fresh ideas to the national case challenge',
    image: '/images/programme-business.jpg',
    imageAlt: 'Students working together on a business project',
    summary: 'A team of future business leaders represented the college with distinction at this year’s competition.',
  },
  {
    category: 'Community',
    date: '06 August 2025',
    title: 'Learning together: our community outreach programme',
    image: '/images/international-study-group.jpg',
    imageAlt: 'A diverse group of international students studying together',
    summary: 'Students and faculty are partnering with local organisations to turn classroom learning into community action.',
  },
]
