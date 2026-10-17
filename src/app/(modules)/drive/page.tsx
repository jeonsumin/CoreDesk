import { notFound, redirect } from 'next/navigation'
import { getCurrentDbUser, type DbSessionUser } from '@/lib/admin'
import { getMenuAccess } from '@/lib/menu/access'
import { getFolderContext } from '@/lib/drive/context'
import { canManageRoot, canModifyItem, canWriteInto, folderAccess } from '@/lib/drive/access'
import type { FolderPerms } from '@/lib/drive/permission-schema'
import { ACCESS_LABELS, type MenuAccessValue, type PermissionRole } from '@/lib/menu/menu-schema'
import { prisma } from '@/lib/prisma'
import { Panel, PanelToolbar } from '@/components/layout/Panel'
import { DriveHeader } from './_components/DriveHeader'
import { DriveGrid } from './_components/DriveGrid'
import { DriveBreadcrumb } from './_components/DriveBreadcrumb'
import type {
  BreadcrumbItem,
  DriveFileItem,
  DriveFolderItem,
  DriveFolderWithCount,
  Role,
} from '@/types'

export const dynamic = 'force-dynamic'

async function buildBreadcrumb(folderId: string | null): Promise<BreadcrumbItem[]> {
  if (!folderId) return []
  const crumbs: BreadcrumbItem[] = []
  let currentId: string | null = folderId
  while (currentId) {
    type FolderRow = { id: string; name: string; parentId: string | null }
    const row: FolderRow | null = await prisma.driveFolder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    })
    if (!row) break
    crumbs.unshift({ id: row.id, name: row.name })
    currentId = row.parentId
  }
  return crumbs
}

type PermRow = { role: Role; access: MenuAccessValue }

const countInclude = { _count: { select: { children: true, files: true } } } as const
// storagePath는 서버 경로라 클라이언트로 보내지 않는다
function toFileItem(
  { storagePath, ...file }: Omit<DriveFileItem, 'canEdit'> & { storagePath: string },
  canEdit: boolean
): DriveFileItem {
  void storagePath
  return { ...file, canEdit }
}

const uploaderSelect = { uploader: { select: { id: true, name: true } } } as const

function isPermissionRole(role: Role): role is PermissionRole {
  return role !== 'ADMIN'
}

function toPerms(rows: PermRow[]): FolderPerms {
  return rows.flatMap((r) => (isPermissionRole(r.role) ? [{ role: r.role, access: r.access }] : []))
}

function toFolderItem(
  { id, name, ownerId, parentId, rootId, createdAt, updatedAt, _count }: DriveFolderWithCount,
  extra: Omit<DriveFolderItem, keyof DriveFolderWithCount>
): DriveFolderItem {
  return { id, name, ownerId, parentId, rootId, createdAt, updatedAt, _count, ...extra }
}

async function loadRoot(user: DbSessionUser, menuAccess: MenuAccessValue) {
  const isAdmin = user.role === 'ADMIN'
  const [ownFolders, ownFiles, shared] = await Promise.all([
    prisma.driveFolder.findMany({
      where: { ownerId: user.id, parentId: null },
      orderBy: { name: 'asc' },
      include: {
        ...countInclude,
        permissions: { select: { role: true, access: true } },
        portfolio: { select: { id: true } },
      },
    }),
    prisma.driveFile.findMany({
      where: { uploaderId: user.id, folderId: null },
      orderBy: { createdAt: 'desc' },
      include: uploaderSelect,
    }),
    prisma.driveFolder.findMany({
      where: {
        parentId: null,
        ownerId: { not: user.id },
        permissions: isAdmin
          ? { some: {} }
          : { some: { role: user.role, access: { in: ['READ', 'WRITE'] } } },
      },
      orderBy: [{ owner: { name: 'asc' } }, { name: 'asc' }],
      include: {
        ...countInclude,
        owner: { select: { name: true } },
        permissions: isAdmin
          ? { select: { role: true, access: true } }
          : { where: { role: user.role }, select: { role: true, access: true } },
        portfolio: { select: { id: true } },
      },
    }),
  ])

  const folders = ownFolders.map((f) => {
    const canManage =
      menuAccess === 'WRITE' &&
      canManageRoot({
        userId: user.id,
        role: user.role,
        rootOwnerId: f.ownerId,
        isPortfolio: f.portfolio !== null,
      })
    return toFolderItem(f, {
      canEdit: canModifyItem({
        access: menuAccess,
        userId: user.id,
        role: user.role,
        creatorId: f.ownerId,
        rootOwnerId: user.id,
      }),
      canManage,
      badge: f.permissions.length > 0 ? '공유' : null,
      perms: canManage ? toPerms(f.permissions) : null,
    })
  })

  const sharedFolders = shared.map((f) => {
    const access = folderAccess({
      userId: user.id,
      role: user.role,
      menuAccess,
      rootOwnerId: f.ownerId,
      rolePerm: f.permissions.find((p) => p.role === user.role)?.access ?? null,
    })
    const canManage =
      menuAccess === 'WRITE' &&
      canManageRoot({
        userId: user.id,
        role: user.role,
        rootOwnerId: f.ownerId,
        isPortfolio: f.portfolio !== null,
      })
    return toFolderItem(f, {
      canEdit: canModifyItem({
        access,
        userId: user.id,
        role: user.role,
        creatorId: f.ownerId,
        rootOwnerId: f.ownerId,
      }),
      canManage,
      badge: `${f.owner.name} · ${ACCESS_LABELS[access]}`,
      perms: canManage ? toPerms(f.permissions) : null,
    })
  })

  const files: DriveFileItem[] = ownFiles.map((file) => toFileItem(file, menuAccess === 'WRITE'))

  return { folders, sharedFolders, files, canWrite: menuAccess === 'WRITE' }
}

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>
}) {
  const user = await getCurrentDbUser()
  if (!user) redirect('/login')
  const menuAccess = await getMenuAccess('/drive')

  const { folderId: rawFolderId } = await searchParams
  const folderId = rawFolderId ?? null

  let folders: DriveFolderItem[]
  let sharedFolders: DriveFolderItem[] = []
  let files: DriveFileItem[]
  let canWrite: boolean

  if (!folderId) {
    ;({ folders, sharedFolders, files, canWrite } = await loadRoot(user, menuAccess))
  } else {
    const ctx = await getFolderContext(folderId, user, menuAccess)
    if (!ctx) notFound()

    const [folderRows, fileRows] = await Promise.all([
      prisma.driveFolder.findMany({
        where: { parentId: folderId },
        orderBy: { name: 'asc' },
        include: countInclude,
      }),
      prisma.driveFile.findMany({
        where: { folderId },
        orderBy: { createdAt: 'desc' },
        include: uploaderSelect,
      }),
    ])
    const canModify = (creatorId: string) =>
      canModifyItem({
        access: ctx.access,
        userId: user.id,
        role: user.role,
        creatorId,
        rootOwnerId: ctx.root.ownerId,
      })

    folders = folderRows.map((f) =>
      toFolderItem(f, { canEdit: canModify(f.ownerId), canManage: false, badge: null, perms: null })
    )
    files = fileRows.map((file) => toFileItem(file, canModify(file.uploaderId)))
    canWrite = canWriteInto(ctx.access)
  }

  const breadcrumb = await buildBreadcrumb(folderId)

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <DriveHeader folderId={folderId} canWrite={canWrite} />
      <Panel className="flex-1">
        <PanelToolbar className="justify-between">
          <DriveBreadcrumb breadcrumb={breadcrumb} />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            폴더 {folders.length + sharedFolders.length} · 파일 {files.length}
          </span>
        </PanelToolbar>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <DriveGrid
            files={files}
            folders={folders}
            sharedFolders={sharedFolders}
            canWrite={canWrite}
          />
        </div>
      </Panel>
    </div>
  )
}
