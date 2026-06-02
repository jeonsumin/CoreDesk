'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import {
  createUniqueDriveFolder,
  deleteDriveFileStorage,
  getDriveUploadError,
  getUniqueDriveFolderName,
  uploadDriveFile,
} from '@/lib/drive-storage'
import { parsePortfolioFormData } from '@/lib/portfolio/validation'
import { prisma } from '@/lib/prisma'
import type { DriveFile } from '@/types'

type ActionResult = { error?: string }

async function ensureAuthenticated(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

function getOptionalFile(formData: FormData, name: string): File | null {
  const file = formData.get(name)
  if (!(file instanceof File) || file.size === 0) return null
  return file
}

function getFiles(formData: FormData, name: string): File[] {
  return formData
    .getAll(name)
    .filter((file): file is File => file instanceof File && file.size > 0)
}

function validateImageFiles(files: File[]): string | null {
  for (const file of files) {
    const error = getDriveUploadError(file, { imagesOnly: true })
    if (error) return `${file.name}: ${error}`
  }
  return null
}

async function rollbackUploadedFiles(files: DriveFile[]) {
  if (files.length === 0) return

  await prisma.driveFile.deleteMany({
    where: { id: { in: files.map((file) => file.id) } },
  })
  await Promise.all(files.map((file) => deleteDriveFileStorage(file)))
}

export async function createPortfolio(formData: FormData): Promise<ActionResult> {
  const ownerId = await ensureAuthenticated()
  const parsed = parsePortfolioFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  const thumbnail = getOptionalFile(formData, 'thumbnail')
  const screenshots = getFiles(formData, 'screenshots')
  const imageError = validateImageFiles([
    ...(thumbnail ? [thumbnail] : []),
    ...screenshots,
  ])
  if (imageError) return { error: imageError }

  const uploadedFiles: DriveFile[] = []
  let driveFolderId: string | null = null
  let portfolioId: string | null = null

  try {
    const driveFolder = await createUniqueDriveFolder({
      name: parsed.data.title,
      ownerId,
    })
    driveFolderId = driveFolder.id

    const thumbnailFile = thumbnail
      ? await uploadDriveFile({
          file: thumbnail,
          uploaderId: ownerId,
          folderId: driveFolder.id,
        })
      : null
    if (thumbnailFile) uploadedFiles.push(thumbnailFile)

    const screenshotFiles: DriveFile[] = []
    for (const screenshot of screenshots) {
      const uploaded = await uploadDriveFile({
        file: screenshot,
        uploaderId: ownerId,
        folderId: driveFolder.id,
      })
      uploadedFiles.push(uploaded)
      screenshotFiles.push(uploaded)
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        techSpecs: parsed.data.techSpecs,
        ownerId,
        driveFolderId: driveFolder.id,
        thumbnailFileId: thumbnailFile?.id,
        links: {
          create: parsed.data.links.map((link, index) => ({
            ...link,
            sortOrder: index,
          })),
        },
        images: {
          create: screenshotFiles.map((file, index) => ({
            fileId: file.id,
            sortOrder: index,
          })),
        },
      },
    })
    portfolioId = portfolio.id
  } catch (err) {
    await rollbackUploadedFiles(uploadedFiles)
    if (driveFolderId) {
      await prisma.driveFolder.delete({ where: { id: driveFolderId } }).catch(() => {})
    }
    console.error('[portfolio.createPortfolio] failed', err)
    return { error: '포트폴리오 생성에 실패했습니다' }
  }

  revalidatePath('/portfolios')
  revalidatePath('/drive')
  redirect(`/portfolios/${portfolioId}`)
}

export async function updatePortfolio(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const ownerId = await ensureAuthenticated()
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: { driveFolder: true, _count: { select: { images: true } } },
  })
  if (!portfolio || portfolio.ownerId !== ownerId) {
    return { error: '포트폴리오를 찾을 수 없습니다' }
  }

  const parsed = parsePortfolioFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  const thumbnail = getOptionalFile(formData, 'thumbnail')
  const screenshots = getFiles(formData, 'screenshots')
  const imageError = validateImageFiles([
    ...(thumbnail ? [thumbnail] : []),
    ...screenshots,
  ])
  if (imageError) return { error: imageError }

  const uploadedFiles: DriveFile[] = []

  try {
    const thumbnailFile = thumbnail
      ? await uploadDriveFile({
          file: thumbnail,
          uploaderId: ownerId,
          folderId: portfolio.driveFolderId,
        })
      : null
    if (thumbnailFile) uploadedFiles.push(thumbnailFile)

    const screenshotFiles: DriveFile[] = []
    for (const screenshot of screenshots) {
      const uploaded = await uploadDriveFile({
        file: screenshot,
        uploaderId: ownerId,
        folderId: portfolio.driveFolderId,
      })
      uploadedFiles.push(uploaded)
      screenshotFiles.push(uploaded)
    }

    const folderName =
      parsed.data.title === portfolio.driveFolder.name
        ? portfolio.driveFolder.name
        : await getUniqueDriveFolderName({
            name: parsed.data.title,
            ownerId,
            parentId: portfolio.driveFolder.parentId,
          })

    await prisma.$transaction([
      prisma.driveFolder.update({
        where: { id: portfolio.driveFolderId },
        data: { name: folderName },
      }),
      prisma.portfolioLink.deleteMany({ where: { portfolioId: id } }),
      prisma.portfolio.update({
        where: { id },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          techSpecs: parsed.data.techSpecs,
          ...(thumbnailFile && { thumbnailFileId: thumbnailFile.id }),
          links: {
            create: parsed.data.links.map((link, index) => ({
              ...link,
              sortOrder: index,
            })),
          },
          images: {
            create: screenshotFiles.map((file, index) => ({
              fileId: file.id,
              sortOrder: portfolio._count.images + index,
            })),
          },
        },
      }),
    ])
  } catch (err) {
    await rollbackUploadedFiles(uploadedFiles)
    console.error('[portfolio.updatePortfolio] failed', err)
    return { error: '포트폴리오 수정에 실패했습니다' }
  }

  revalidatePath('/portfolios')
  revalidatePath(`/portfolios/${id}`)
  revalidatePath('/drive')
  redirect(`/portfolios/${id}`)
}

export async function deletePortfolio(id: string): Promise<ActionResult> {
  const ownerId = await ensureAuthenticated()
  const portfolio = await prisma.portfolio.findUnique({ where: { id } })
  if (!portfolio || portfolio.ownerId !== ownerId) {
    return { error: '포트폴리오를 찾을 수 없습니다' }
  }

  await prisma.portfolio.delete({ where: { id } })
  revalidatePath('/portfolios')
  redirect('/portfolios')
}

export async function deletePortfolioFormAction(id: string): Promise<void> {
  const result = await deletePortfolio(id)
  if (result.error) throw new Error(result.error)
}
