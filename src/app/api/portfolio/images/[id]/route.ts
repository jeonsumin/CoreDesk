import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { resolveDriveStoragePath } from '@/lib/drive-upload-path'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const file = await prisma.driveFile.findUnique({ where: { id } })
  if (!file) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Check if this file belongs to a public portfolio (as image or thumbnail)
  const portfolioByImage = await prisma.portfolio.findFirst({
    where: {
      isPublic: true,
      images: { some: { fileId: id } },
    },
    select: { id: true },
  })

  const portfolioByThumbnail = portfolioByImage
    ? null
    : await prisma.portfolio.findFirst({
        where: {
          isPublic: true,
          thumbnailFileId: id,
        },
        select: { id: true },
      })

  if (!portfolioByImage && !portfolioByThumbnail) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const fullPath = resolveDriveStoragePath(file.storagePath)

  let buffer: Buffer
  try {
    buffer = await readFile(fullPath)
  } catch {
    return new NextResponse('File missing on disk', { status: 404 })
  }

  const headers: Record<string, string> = {
    'Content-Type': file.mimeType,
    'Content-Length': buffer.length.toString(),
    'Cache-Control': 'public, max-age=3600',
    'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
  }

  return new NextResponse(new Uint8Array(buffer), { headers })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
