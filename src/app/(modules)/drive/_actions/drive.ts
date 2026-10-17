'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentDbUser, type DbSessionUser } from '@/lib/admin'
import { requireMenuWrite } from '@/lib/menu/access'
import { getFolderContext } from '@/lib/drive/context'
import { canManageRoot, canModifyItem, canWriteInto } from '@/lib/drive/access'
import { folderPermsSchema, type FolderPerms } from '@/lib/drive/permission-schema'
import { prisma } from '@/lib/prisma'
import {
  deleteDriveFileStorage,
  getDriveUploadError,
  uploadDriveFile,
} from '@/lib/drive-storage'

type ActionResult = { success: boolean; error?: string }

const nameSchema = z.object({
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(255, '이름이 너무 깁니다'),
})

const renameSchema = z.object({
  newName: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(255, '이름이 너무 깁니다'),
})

async function getActor() {
  await requireMenuWrite('/drive')
  return getCurrentDbUser()
}

// ─── Folder actions ───────────────────────────────────────────────────────────

export async function createFolder(
  name: string,
  parentId: string | null,
  perms?: FolderPerms
): Promise<ActionResult> {
  const user = await getActor()
  if (!user) return { success: false, error: '로그인이 필요합니다' }

  const parsed = nameSchema.safeParse({ name })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const trimmed = parsed.data.name.trim()

  if (parentId) {
    const ctx = await getFolderContext(parentId, user, 'WRITE')
    if (!ctx || !canWriteInto(ctx.access)) {
      return { success: false, error: '상위 폴더를 찾을 수 없습니다' }
    }

    const duplicate = await prisma.driveFolder.findFirst({
      where: { parentId, name: trimmed },
    })
    if (duplicate) return { success: false, error: '같은 이름의 폴더가 이미 있습니다' }

    await prisma.driveFolder.create({
      data: {
        name: trimmed,
        ownerId: user.id,
        parentId,
        rootId: ctx.folder.rootId ?? ctx.folder.id,
      },
    })
  } else {
    const permsParsed = folderPermsSchema.safeParse(perms ?? [])
    if (!permsParsed.success) {
      return { success: false, error: permsParsed.error.errors[0].message }
    }

    const duplicate = await prisma.driveFolder.findFirst({
      where: { ownerId: user.id, parentId: null, name: trimmed },
    })
    if (duplicate) return { success: false, error: '같은 이름의 폴더가 이미 있습니다' }

    await prisma.$transaction(async (tx) => {
      const folder = await tx.driveFolder.create({
        data: { name: trimmed, ownerId: user.id, parentId: null },
      })
      const rows = permsParsed.data.filter((p) => p.access !== 'NONE')
      if (rows.length > 0) {
        await tx.driveFolderPermission.createMany({
          data: rows.map((p) => ({ folderId: folder.id, role: p.role, access: p.access })),
        })
      }
    })
  }

  revalidatePath('/drive')
  return { success: true }
}

export async function renameFolder(id: string, newName: string): Promise<ActionResult> {
  const user = await getActor()
  if (!user) return { success: false, error: '로그인이 필요합니다' }

  const parsed = nameSchema.safeParse({ name: newName })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const ctx = await getFolderContext(id, user, 'WRITE')
  if (!ctx) return { success: false, error: '폴더를 찾을 수 없습니다' }
  if (
    !canModifyItem({
      access: ctx.access,
      userId: user.id,
      role: user.role,
      creatorId: ctx.folder.ownerId,
      rootOwnerId: ctx.root.ownerId,
    })
  ) {
    return { success: false, error: '권한이 없습니다' }
  }

  await prisma.driveFolder.update({ where: { id }, data: { name: parsed.data.name.trim() } })

  revalidatePath('/drive')
  return { success: true }
}

export async function deleteFolder(id: string): Promise<ActionResult> {
  const user = await getActor()
  if (!user) return { success: false, error: '로그인이 필요합니다' }

  const ctx = await getFolderContext(id, user, 'WRITE')
  if (!ctx) return { success: false, error: '폴더를 찾을 수 없습니다' }

  const allowed =
    ctx.folder.parentId === null
      ? canManageRoot({
          userId: user.id,
          role: user.role,
          rootOwnerId: ctx.root.ownerId,
          isPortfolio: ctx.isPortfolio,
        })
      : canModifyItem({
          access: ctx.access,
          userId: user.id,
          role: user.role,
          creatorId: ctx.folder.ownerId,
          rootOwnerId: ctx.root.ownerId,
        })
  if (!allowed) return { success: false, error: '권한이 없습니다' }

  // 비어 있는지 확인과 삭제를 한 쿼리로 처리해 동시 쓰기와의 경쟁을 막는다
  const { count } = await prisma.driveFolder.deleteMany({
    where: { id, children: { none: {} }, files: { none: {} } },
  })
  if (count === 0) {
    return { success: false, error: '폴더가 비어 있지 않아 삭제할 수 없습니다' }
  }

  revalidatePath('/drive')
  return { success: true }
}

export async function setFolderPermissions(
  rootId: string,
  perms: FolderPerms
): Promise<ActionResult> {
  const user = await getActor()
  if (!user) return { success: false, error: '로그인이 필요합니다' }

  const ctx = await getFolderContext(rootId, user, 'WRITE')
  if (!ctx || ctx.folder.parentId !== null) {
    return { success: false, error: '폴더를 찾을 수 없습니다' }
  }
  if (
    !canManageRoot({
      userId: user.id,
      role: user.role,
      rootOwnerId: ctx.root.ownerId,
      isPortfolio: ctx.isPortfolio,
    })
  ) {
    return { success: false, error: '권한이 없습니다' }
  }

  const parsed = folderPermsSchema.safeParse(perms)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  await prisma.$transaction([
    prisma.driveFolderPermission.deleteMany({ where: { folderId: rootId } }),
    prisma.driveFolderPermission.createMany({
      data: parsed.data
        .filter((p) => p.access !== 'NONE')
        .map((p) => ({ folderId: rootId, role: p.role, access: p.access })),
    }),
  ])

  revalidatePath('/drive')
  return { success: true }
}

// ─── File actions ─────────────────────────────────────────────────────────────

export async function uploadFile(formData: FormData): Promise<ActionResult> {
  const user = await getActor()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, error: '파일이 첨부되지 않았습니다' }
  }
  const uploadError = getDriveUploadError(file)
  if (uploadError) {
    return { success: false, error: uploadError }
  }

  const folderId = (formData.get('folderId') as string | null) || null
  if (folderId) {
    const ctx = await getFolderContext(folderId, user, 'WRITE')
    if (!ctx || !canWriteInto(ctx.access)) {
      return { success: false, error: '업로드할 폴더를 찾을 수 없습니다' }
    }
  }

  try {
    await uploadDriveFile({
      file,
      uploaderId: user.id,
      folderId,
    })
  } catch (err) {
    console.error('[drive.uploadFile] write failed', err)
    return { success: false, error: '파일 저장에 실패했습니다' }
  }

  revalidatePath('/drive')
  return { success: true }
}

async function checkFileModify(
  file: { uploaderId: string; folderId: string | null },
  user: DbSessionUser
): Promise<'ok' | 'notfound' | 'forbidden'> {
  if (file.folderId === null) return file.uploaderId === user.id ? 'ok' : 'notfound'
  const ctx = await getFolderContext(file.folderId, user, 'WRITE')
  if (!ctx) return 'notfound'
  return canModifyItem({
    access: ctx.access,
    userId: user.id,
    role: user.role,
    creatorId: file.uploaderId,
    rootOwnerId: ctx.root.ownerId,
  })
    ? 'ok'
    : 'forbidden'
}

export async function deleteFile(id: string): Promise<ActionResult> {
  const user = await getActor()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const file = await prisma.driveFile.findUnique({ where: { id } })
  if (!file) {
    return { success: false, error: '파일을 찾을 수 없습니다' }
  }
  const check = await checkFileModify(file, user)
  if (check === 'notfound') return { success: false, error: '파일을 찾을 수 없습니다' }
  if (check === 'forbidden') return { success: false, error: '삭제 권한이 없습니다' }

  // Delete DB row first; if the FS unlink fails we leave an orphan file
  // rather than leaving a dangling DB row pointing at a missing file.
  try {
    await prisma.driveFile.delete({ where: { id } })
  } catch (err) {
    console.error('[drive.deleteFile] db delete failed', err)
    return { success: false, error: '삭제에 실패했습니다' }
  }

  await deleteDriveFileStorage(file)

  revalidatePath('/drive')
  return { success: true }
}

export async function renameFile(
  id: string,
  newName: string
): Promise<ActionResult> {
  const user = await getActor()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const parsed = renameSchema.safeParse({ newName })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const file = await prisma.driveFile.findUnique({ where: { id } })
  if (!file) {
    return { success: false, error: '파일을 찾을 수 없습니다' }
  }
  const check = await checkFileModify(file, user)
  if (check === 'notfound') return { success: false, error: '파일을 찾을 수 없습니다' }
  if (check === 'forbidden') return { success: false, error: '이름 변경 권한이 없습니다' }

  await prisma.driveFile.update({
    where: { id },
    data: { name: parsed.data.newName.trim() },
  })

  revalidatePath('/drive')
  return { success: true }
}
