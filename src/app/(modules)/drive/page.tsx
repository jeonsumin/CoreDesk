import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Panel, PanelToolbar } from '@/components/layout/Panel'
import { DriveHeader } from './_components/DriveHeader'
import { DriveGrid } from './_components/DriveGrid'
import { DriveBreadcrumb } from './_components/DriveBreadcrumb'
import type { BreadcrumbItem } from '@/types'

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

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { folderId: rawFolderId } = await searchParams
  const folderId = rawFolderId ?? null

  const [folders, files, breadcrumb] = await Promise.all([
    prisma.driveFolder.findMany({
      where: { ownerId: session.user.id, parentId: folderId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { children: true, files: true } } },
    }),
    prisma.driveFile.findMany({
      where: { uploaderId: session.user.id, folderId: folderId },
      orderBy: { createdAt: 'desc' },
      include: { uploader: true },
    }),
    buildBreadcrumb(folderId),
  ])

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <DriveHeader folderId={folderId} />
      <Panel className="flex-1">
        <PanelToolbar className="justify-between">
          <DriveBreadcrumb breadcrumb={breadcrumb} />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            폴더 {folders.length} · 파일 {files.length}
          </span>
        </PanelToolbar>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <DriveGrid files={files} folders={folders} />
        </div>
      </Panel>
    </div>
  )
}
