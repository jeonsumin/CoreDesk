'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
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

// ─── Folder actions ───────────────────────────────────────────────────────────

export async function createFolder(
  name: string,
  parentId: string | null
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: '로그인이 필요합니다' }

  const parsed = nameSchema.safeParse({ name })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  if (parentId) {
    const parent = await prisma.driveFolder.findUnique({ where: { id: parentId } })
    if (!parent || parent.ownerId !== session.user.id) {
      return { success: false, error: '상위 폴더를 찾을 수 없습니다' }
    }
  }

  const duplicate = await prisma.driveFolder.findFirst({
    where: { ownerId: session.user.id, parentId: parentId ?? null, name: parsed.data.name.trim() },
  })
  if (duplicate) return { success: false, error: '같은 이름의 폴더가 이미 있습니다' }

  await prisma.driveFolder.create({
    data: {
      name: parsed.data.name.trim(),
      ownerId: session.user.id,
      parentId: parentId ?? null,
    },
  })

  revalidatePath('/drive')
  return { success: true }
}

export async function renameFolder(id: string, newName: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: '로그인이 필요합니다' }

  const parsed = nameSchema.safeParse({ name: newName })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const folder = await prisma.driveFolder.findUnique({ where: { id } })
  if (!folder) return { success: false, error: '폴더를 찾을 수 없습니다' }
  if (folder.ownerId !== session.user.id) return { success: false, error: '권한이 없습니다' }

  await prisma.driveFolder.update({ where: { id }, data: { name: parsed.data.name.trim() } })

  revalidatePath('/drive')
  return { success: true }
}

export async function deleteFolder(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: '로그인이 필요합니다' }

  const folder = await prisma.driveFolder.findUnique({
    where: { id },
    include: { _count: { select: { children: true, files: true } } },
  })
  if (!folder) return { success: false, error: '폴더를 찾을 수 없습니다' }
  if (folder.ownerId !== session.user.id) return { success: false, error: '권한이 없습니다' }
  if (folder._count.children > 0 || folder._count.files > 0) {
    return { success: false, error: '폴더가 비어 있지 않아 삭제할 수 없습니다' }
  }

  await prisma.driveFolder.delete({ where: { id } })

  revalidatePath('/drive')
  return { success: true }
}

// ─── File actions ─────────────────────────────────────────────────────────────

export async function uploadFile(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
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
    const folder = await prisma.driveFolder.findUnique({ where: { id: folderId } })
    if (!folder || folder.ownerId !== session.user.id) {
      return { success: false, error: '업로드할 폴더를 찾을 수 없습니다' }
    }
  }

  try {
    await uploadDriveFile({
      file,
      uploaderId: session.user.id,
      folderId,
    })
  } catch (err) {
    console.error('[drive.uploadFile] write failed', err)
    return { success: false, error: '파일 저장에 실패했습니다' }
  }

  revalidatePath('/drive')
  return { success: true }
}

export async function deleteFile(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const file = await prisma.driveFile.findUnique({ where: { id } })
  if (!file) {
    return { success: false, error: '파일을 찾을 수 없습니다' }
  }
  if (file.uploaderId !== session.user.id) {
    return { success: false, error: '삭제 권한이 없습니다' }
  }

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
  const session = await auth()
  if (!session?.user?.id) {
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
  if (file.uploaderId !== session.user.id) {
    return { success: false, error: '이름 변경 권한이 없습니다' }
  }

  await prisma.driveFile.update({
    where: { id },
    data: { name: parsed.data.newName.trim() },
  })

  revalidatePath('/drive')
  return { success: true }
}
