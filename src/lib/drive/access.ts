import { MenuAccessValue, MENU_ACCESS } from '../menu/menu-schema'
import type { RoleValue as Role } from '../system/user-schema'

interface FolderAccessInput {
  userId: string
  role: Role
  menuAccess: MenuAccessValue
  rootOwnerId: string
  userPerm: MenuAccessValue | null
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

  if (i.userPerm === null) {
    return 'NONE'
  }

  return getMinAccess(i.menuAccess, i.userPerm)
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
