import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { resolveDriveStoragePath } from '@/lib/drive-upload-path'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { getMenuAccess } from '@/lib/menu/access'
import { getFolderContext } from '@/lib/drive/context'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentDbUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const menuAccess = await getMenuAccess('/drive')
  if (menuAccess === 'NONE') {
    return new NextResponse('Not Found', { status: 404 })
  }

  const { id } = await params
  const file = await prisma.driveFile.findUnique({ where: { id } })
  if (!file) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (file.folderId === null) {
    if (file.uploaderId !== user.id) {
      return new NextResponse('Not Found', { status: 404 })
    }
  } else {
    const ctx = await getFolderContext(file.folderId, user, menuAccess)
    if (!ctx) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  const fullPath = resolveDriveStoragePath(file.storagePath)

  let buffer: Buffer
  try {
    buffer = await readFile(fullPath)
  } catch {
    return new NextResponse('File missing on disk', { status: 404 })
  }

  const download = req.nextUrl.searchParams.get('download')
  const headers: Record<string, string> = {
    'Content-Type': file.mimeType,
    'Content-Length': buffer.length.toString(),
    // Browser cache only — auth-gated content stays private.
    'Cache-Control': 'private, max-age=60',
  }
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(file.originalName)}"`
  } else {
    headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(file.originalName)}"`
  }

  return new NextResponse(new Uint8Array(buffer), { headers })
}
