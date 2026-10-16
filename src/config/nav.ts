import {
  LayoutDashboard,
  FolderKanban,
  HardDrive,
  BriefcaseBusiness,
  NotepadText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  phase: number
  disabled?: boolean
  adminOnly?: boolean
  children?: NavItem[]
}

export const navItems: NavItem[] = [
  { title: '대시보드', href: '/dashboard', icon: LayoutDashboard, phase: 1 },
  { title: '프로젝트 관리', href: '/projects', icon: FolderKanban, phase: 1 },
  {
    title: '포트폴리오 관리',
    href: '/portfolios',
    icon: BriefcaseBusiness,
    phase: 1,
  },
  { title: '메모', href: '/memos', icon: NotepadText, phase: 1 },
  { title: '드라이브', href: '/drive', icon: HardDrive, phase: 1 },
  {
    title: '시스템관리',
    href: '/system',
    icon: Settings,
    phase: 1,
    adminOnly: true,
    children: [
      { title: '사용자관리', href: '/system/users', icon: Users, phase: 1 },
    ],
  },
]
