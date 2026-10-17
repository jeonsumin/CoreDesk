import { PrismaClient, MenuAccess } from '@prisma/client'

const ROLES = ['MANAGER', 'MEMBER', 'VIEWER'] as const
const SYSTEM_GROUP_ID = 'menu-system'

type PageSeed = {
  title: string
  path: string
  icon: string
  sortOrder: number
  section: string | null
  isSystem: boolean
  parentId: string | null
}

const PAGES: PageSeed[] = [
  { title: '대시보드', path: '/dashboard', icon: 'LayoutDashboard', sortOrder: 0, section: '업무', isSystem: false, parentId: null },
  { title: '프로젝트 관리', path: '/projects', icon: 'FolderKanban', sortOrder: 1, section: '업무', isSystem: false, parentId: null },
  { title: '포트폴리오 관리', path: '/portfolios', icon: 'BriefcaseBusiness', sortOrder: 2, section: '자료', isSystem: false, parentId: null },
  { title: '메모', path: '/memos', icon: 'NotepadText', sortOrder: 3, section: '자료', isSystem: false, parentId: null },
  { title: '드라이브', path: '/drive', icon: 'HardDrive', sortOrder: 4, section: '자료', isSystem: false, parentId: null },
  { title: '사용자관리', path: '/system/users', icon: 'Users', sortOrder: 0, section: null, isSystem: true, parentId: SYSTEM_GROUP_ID },
  { title: '메뉴관리', path: '/system/menus', icon: 'Menu', sortOrder: 1, section: null, isSystem: true, parentId: SYSTEM_GROUP_ID },
  { title: '권한관리', path: '/system/permissions', icon: 'ShieldCheck', sortOrder: 2, section: null, isSystem: true, parentId: SYSTEM_GROUP_ID },
]

export async function seedMenus(prisma: PrismaClient): Promise<void> {
  await prisma.menu.upsert({
    where: { id: SYSTEM_GROUP_ID },
    update: {},
    create: {
      id: SYSTEM_GROUP_ID,
      title: '시스템관리',
      type: 'GROUP',
      icon: 'Settings',
      sortOrder: 5,
      section: '관리',
      isSystem: true,
    },
  })

  for (const { path, ...rest } of PAGES) {
    const menu = await prisma.menu.upsert({
      where: { path },
      update: {},
      create: { ...rest, path, type: 'PAGE' },
    })
    const access: MenuAccess = menu.isSystem ? 'NONE' : 'WRITE'
    for (const role of ROLES) {
      await prisma.menuPermission.upsert({
        where: { menuId_role: { menuId: menu.id, role } },
        update: {},
        create: { menuId: menu.id, role, access },
      })
    }
  }
}

if (require.main === module) {
  const prisma = new PrismaClient()
  seedMenus(prisma)
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
