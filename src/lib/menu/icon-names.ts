export const ICON_NAMES = [
  'LayoutDashboard',
  'FolderKanban',
  'BriefcaseBusiness',
  'NotepadText',
  'HardDrive',
  'Settings',
  'Users',
  'Menu',
  'ShieldCheck',
  'ListTodo',
  'Link',
  'FileText',
  'Calendar',
  'BarChart3',
  'Folder',
] as const

export type IconName = (typeof ICON_NAMES)[number]
