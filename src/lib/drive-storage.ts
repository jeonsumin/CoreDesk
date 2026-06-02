import { randomBytes } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { optimizeImageForUpload } from '@/lib/image-compression'
import {
  createDriveStorageLocation,
  DEFAULT_DRIVE_UPLOAD_ROOT,
  resolveDriveStoragePath,
} from '@/lib/drive-upload-path'
import { prisma } from '@/lib/prisma'
import type { DriveFile, DriveFolder } from '@/types'

export const DRIVE_UPLOAD_ROOT = DEFAULT_DRIVE_UPLOAD_ROOT
export const MAX_DRIVE_FILE_SIZE_BYTES = 50 * 1024 * 1024

type CreateDriveFolderInput = {
  name: string
  ownerId: string
  parentId?: string | null
}

type UploadDriveFileInput = {
  file: File
  uploaderId: string
  folderId?: string | null
}

function generateStorageFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const unique = randomBytes(12).toString('hex')
  return `${unique}${ext}`
}

export function getDriveUploadError(
  file: File,
  options: { imagesOnly?: boolean } = {},
): string | null {
  if (file.size === 0) return '빈 파일은 업로드할 수 없습니다'
  if (file.size > MAX_DRIVE_FILE_SIZE_BYTES) {
    return '파일 크기가 50MB를 초과합니다'
  }
  if (options.imagesOnly && !file.type.startsWith('image/')) {
    return '이미지 파일만 업로드할 수 있습니다'
  }
  return null
}

export async function getUniqueDriveFolderName({
  name,
  ownerId,
  parentId = null,
}: CreateDriveFolderInput): Promise<string> {
  const trimmedName = name.trim()
  const siblings = await prisma.driveFolder.findMany({
    where: { ownerId, parentId },
    select: { name: true },
  })
  const existingNames = new Set(siblings.map((folder) => folder.name))
  if (!existingNames.has(trimmedName)) return trimmedName

  let suffix = 2
  while (existingNames.has(`${trimmedName} (${suffix})`)) {
    suffix += 1
  }
  return `${trimmedName} (${suffix})`
}

export async function createUniqueDriveFolder({
  name,
  ownerId,
  parentId = null,
}: CreateDriveFolderInput): Promise<DriveFolder> {
  const uniqueName = await getUniqueDriveFolderName({ name, ownerId, parentId })

  return prisma.driveFolder.create({
    data: {
      name: uniqueName,
      ownerId,
      parentId,
    },
  })
}

export async function uploadDriveFile({
  file,
  uploaderId,
  folderId = null,
}: UploadDriveFileInput): Promise<DriveFile> {
  const storageFileName = generateStorageFileName(file.name)
  const storageLocation = createDriveStorageLocation({ storageFileName })

  await mkdir(storageLocation.absoluteDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  const uploadBuffer = await optimizeImageForUpload({
    buffer,
    mimeType: file.type || 'application/octet-stream',
  })
  await writeFile(storageLocation.absolutePath, uploadBuffer.buffer)

  try {
    return await prisma.driveFile.create({
      data: {
        name: file.name,
        originalName: file.name,
        mimeType: uploadBuffer.mimeType,
        size: uploadBuffer.buffer.length,
        storagePath: storageLocation.storagePath,
        uploaderId,
        folderId,
      },
    })
  } catch (err) {
    await unlink(storageLocation.absolutePath).catch(() => {})
    throw err
  }
}

export async function deleteDriveFileStorage(file: Pick<DriveFile, 'storagePath'>) {
  const absolutePath = resolveDriveStoragePath(file.storagePath)
  await unlink(absolutePath).catch((err) => {
    console.warn('[drive.deleteFileStorage] fs unlink failed (orphan left)', err)
  })
}
