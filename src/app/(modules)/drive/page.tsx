import { notFound, redirect } from 'next/navigation'
import { getCurrentDbUser, type DbSessionUser } from '@/lib/admin'
import { getMenuPermission } from '@/lib/menu/access'
import type { MenuPermission } from '@/lib/menu/resolve'
import { getFolderContext } from '@/lib/drive/context'
import { canManageRoot, canModifyItem, canWriteInto, folderAccess } from '@/lib/drive/access'
import type { FolderPerms } from '@/lib/drive/permission-schema'
import { ACCESS_LABELS, type MenuAccessValue } from '@/lib/menu/menu-schema'
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
  ShareUserOption,
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

type PermRow = { userId: string; access: MenuAccessValue }

const countInclude = { _count: { select: { children: true, files: true } } } as const
// storagePath는 서버 경로라 클라이언트로 보내지 않는다
function toFileItem(
  { storagePath, ...file }: Omit<DriveFileItem, 'canEdit' | 'canDelete'> & { storagePath: string },
  canModify: boolean,
  menu: MenuPermission
): DriveFileItem {
  void storagePath
  return { ...file, canEdit: canModify && menu.update, canDelete: canModify && menu.delete }
}

const uploaderSelect = { uploader: { select: { id: true, name: true } } } as const

function toPerms(rows: PermRow[]): FolderPerms {
  return rows.flatMap((r) => (r.access === 'NONE' ? [] : [{ userId: r.userId, access: r.access }]))
}

function toFolderItem(
  { id, name, ownerId, parentId, rootId, createdAt, updatedAt, _count }: DriveFolderWithCount,
  extra: Omit<DriveFolderItem, keyof DriveFolderWithCount>
): DriveFolderItem {
  return { id, name, ownerId, parentId, rootId, createdAt, updatedAt, _count, ...extra }
}

// 폴더 공유 수준(숨김/읽기/쓰기)이 폴더 안에서 쓸 수 있는지를, 메뉴 권한이 어떤 쓰기(쓰기·수정·삭제)인지를 정한다
async function loadRoot(user: DbSessionUser, menu: MenuPermission) {
  const isAdmin = user.role === 'ADMIN'
  const menuAccess: MenuAccessValue = menu.read ? 'WRITE' : 'NONE'
  const [ownFolders, ownFiles, shared] = await Promise.all([
    prisma.driveFolder.findMany({
      where: { ownerId: user.id, parentId: null },
      orderBy: { name: 'asc' },
      include: {
        ...countInclude,
        permissions: { select: { userId: true, access: true } },
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
          : { some: { userId: user.id, access: { in: ['READ', 'WRITE'] } } },
      },
      orderBy: [{ owner: { name: 'asc' } }, { name: 'asc' }],
      include: {
        ...countInclude,
        owner: { select: { name: true } },
        permissions: isAdmin
          ? { select: { userId: true, access: true } }
          : { where: { userId: user.id }, select: { userId: true, access: true } },
        portfolio: { select: { id: true } },
      },
    }),
  ])

  const folders = ownFolders.map((f) => {
    const ownsRoot = canManageRoot({
      userId: user.id,
      role: user.role,
      rootOwnerId: f.ownerId,
      isPortfolio: f.portfolio !== null,
    })
    const canManage = menu.update && ownsRoot
    return toFolderItem(f, {
      canEdit:
        menu.update &&
        canModifyItem({
          access: menuAccess,
          userId: user.id,
          role: user.role,
          creatorId: f.ownerId,
          rootOwnerId: user.id,
        }),
      canDelete: menu.delete && ownsRoot,
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
      userPerm: f.permissions.find((p) => p.userId === user.id)?.access ?? null,
    })
    const ownsRoot = canManageRoot({
      userId: user.id,
      role: user.role,
      rootOwnerId: f.ownerId,
      isPortfolio: f.portfolio !== null,
    })
    const canManage = menu.update && ownsRoot
    return toFolderItem(f, {
      canEdit:
        menu.update &&
        canModifyItem({
          access,
          userId: user.id,
          role: user.role,
          creatorId: f.ownerId,
          rootOwnerId: f.ownerId,
        }),
      canDelete: menu.delete && ownsRoot,
      canManage,
      badge: `${f.owner.name} · ${ACCESS_LABELS[access]}`,
      perms: canManage ? toPerms(f.permissions) : null,
    })
  })

  const files: DriveFileItem[] = ownFiles.map((file) => toFileItem(file, true, menu))

  return { folders, sharedFolders, files, canWrite: menu.create }
}

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>
}) {
  const user = await getCurrentDbUser()
  if (!user) redirect('/login')
  const menu = await getMenuPermission('/drive')
  // 최고 관리자는 모든 폴더를 볼 수 있어 공유 대상에서 뺀다
  const shareUsers: ShareUserOption[] = await prisma.user.findMany({
    where: { isActive: true, role: 'USER', id: { not: user.id } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  const { folderId: rawFolderId } = await searchParams
  const folderId = rawFolderId ?? null

  let folders: DriveFolderItem[]
  let sharedFolders: DriveFolderItem[] = []
  let files: DriveFileItem[]
  let canWrite: boolean

  if (!folderId) {
    ;({ folders, sharedFolders, files, canWrite } = await loadRoot(user, menu))
  } else {
    const ctx = await getFolderContext(folderId, user, menu.read ? 'WRITE' : 'NONE')
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
      toFolderItem(f, {
        canEdit: menu.update && canModify(f.ownerId),
        canDelete: menu.delete && canModify(f.ownerId),
        canManage: false,
        badge: null,
        perms: null,
      })
    )
    files = fileRows.map((file) => toFileItem(file, canModify(file.uploaderId), menu))
    canWrite = menu.create && canWriteInto(ctx.access)
  }

  const breadcrumb = await buildBreadcrumb(folderId)

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <DriveHeader folderId={folderId} canWrite={canWrite} shareUsers={shareUsers} />
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
            shareUsers={shareUsers}
          />
        </div>
      </Panel>
    </div>
  )
}
