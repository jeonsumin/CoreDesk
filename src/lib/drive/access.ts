import { MenuAccessValue, MENU_ACCESS } from '../menu/menu-schema'

export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER'

interface FolderAccessInput {
  userId: string
  role: Role
  menuAccess: MenuAccessValue
  rootOwnerId: string
  rolePerm: MenuAccessValue | null
}

interface CanModifyItemInput {
  access: MenuAccessValue
  userId: string
  role: Role
  creatorId: string
  rootOwnerId: string
}

interface CanManageRootInput {
  userId: string
  role: Role
  rootOwnerId: string
  isPortfolio: boolean
}

export function folderAccess(i: FolderAccessInput): MenuAccessValue {
  if (i.role === 'ADMIN') {
    return i.menuAccess
  }

  if (i.userId === i.rootOwnerId) {
    return i.menuAccess
  }

  if (i.rolePerm === null) {
    return 'NONE'
  }

  return getMinAccess(i.menuAccess, i.rolePerm)
}

export function canModifyItem(i: CanModifyItemInput): boolean {
  return (
    i.access === 'WRITE' &&
    (i.creatorId === i.userId || i.rootOwnerId === i.userId || i.role === 'ADMIN')
  )
}

export function canManageRoot(i: CanManageRootInput): boolean {
  return !i.isPortfolio && (i.rootOwnerId === i.userId || i.role === 'ADMIN')
}

export function canWriteInto(access: MenuAccessValue): boolean {
  return access === 'WRITE'
}

function getMinAccess(a: MenuAccessValue, b: MenuAccessValue): MenuAccessValue {
  const indexA = MENU_ACCESS.indexOf(a)
  const indexB = MENU_ACCESS.indexOf(b)
  return indexA < indexB ? a : b
}
