import {
  LayoutDashboard,
  FolderKanban,
  HardDrive,
  BriefcaseBusiness,
  NotepadText,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  phase: number
  disabled?: boolean
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
]
