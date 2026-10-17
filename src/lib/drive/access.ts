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

/**
 * Determines folder access based on role, menuAccess, and rolePerm.
 * Returns the minimum of menuAccess and rolePerm.
 */
export function folderAccess(i: FolderAccessInput): MenuAccessValue {
  // ADMIN gets their menuAccess
  if (i.role === 'ADMIN') {
    return i.menuAccess
  }

  // Root owner gets their menuAccess
  if (i.userId === i.rootOwnerId) {
    return i.menuAccess
  }

  // No permission row → NONE
  if (i.rolePerm === null) {
    return 'NONE'
  }

  // Return minimum of menuAccess and rolePerm
  return getMinAccess(i.menuAccess, i.rolePerm)
}

/**
 * Determines if user can modify an item with given access.
 */
export function canModifyItem(i: CanModifyItemInput): boolean {
  // ADMIN can modify anything
  if (i.role === 'ADMIN') {
    return true
  }

  // Root owner can modify anything
  if (i.userId === i.rootOwnerId) {
    return true
  }

  // Creator of item with WRITE access can modify
  if (i.userId === i.creatorId && i.access === 'WRITE') {
    return true
  }

  return false
}

/**
 * Determines if user can manage the root folder.
 * Only ADMIN (non-portfolio) can manage root.
 */
export function canManageRoot(i: CanManageRootInput): boolean {
  // Portfolios cannot be managed
  if (i.isPortfolio) {
    return false
  }

  // Only ADMIN can manage root
  if (i.role !== 'ADMIN') {
    return false
  }

  return true
}

/**
 * Simple predicate: can write into folder with given access?
 */
export function canWriteInto(access: MenuAccessValue): boolean {
  return access === 'WRITE'
}

/**
 * Returns the minimum access level between two.
 * Order: NONE < READ < WRITE
 */
function getMinAccess(a: MenuAccessValue, b: MenuAccessValue): MenuAccessValue {
  const indexA = MENU_ACCESS.indexOf(a)
  const indexB = MENU_ACCESS.indexOf(b)
  return indexA < indexB ? a : b
}
