import { prisma } from '@/lib/prisma'
import type { DriveFolder } from '@prisma/client'
import type { DbSessionUser } from '@/lib/admin'
import type { MenuAccessValue } from '@/lib/menu/menu-schema'
import { folderAccess } from './access'

export type FolderContext = {
  folder: DriveFolder
  root: DriveFolder
  access: MenuAccessValue
  isPortfolio: boolean
}

export async function getFolderContext(
  folderId: string,
  user: DbSessionUser,
  menuAccess: MenuAccessValue
): Promise<FolderContext | null> {
  const rootInclude = {
    permissions: { where: { role: user.role } },
    portfolio: { select: { id: true } },
  }

  const first = await prisma.driveFolder.findUnique({
    where: { id: folderId },
    include: rootInclude,
  })
  if (!first) return null

  const rootRow =
    first.rootId === null
      ? first
      : await prisma.driveFolder.findUnique({
          where: { id: first.rootId },
          include: rootInclude,
        })
  if (!rootRow) return null

  const { permissions, portfolio, ...root } = rootRow
  const { permissions: _p, portfolio: _pf, ...folder } = first
  void _p
  void _pf

  const access = folderAccess({
    userId: user.id,
    role: user.role,
    menuAccess,
    rootOwnerId: root.ownerId,
    rolePerm: permissions[0]?.access ?? null,
  })
  if (access === 'NONE') return null

  return { folder, root, access, isPortfolio: portfolio !== null }
}
