import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === 'string')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const portfolio = await prisma.portfolio.findUnique({
    where: { id, isPublic: true },
    select: {
      id: true,
      title: true,
      description: true,
      techSpecs: true,
      thumbnailFileId: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { name: true } },
      links: {
        select: { id: true, type: true, label: true, url: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
      images: {
        select: { id: true, fileId: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!portfolio) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const base = req.nextUrl.origin

  return NextResponse.json({
    id: portfolio.id,
    title: portfolio.title,
    description: portfolio.description,
    tags: parseTags(portfolio.techSpecs),
    thumbnailUrl: portfolio.thumbnailFileId
      ? `${base}/api/portfolio/images/${portfolio.thumbnailFileId}`
      : null,
    links: portfolio.links,
    images: portfolio.images.map((img) => ({
      id: img.id,
      url: `${base}/api/portfolio/images/${img.fileId}`,
      sortOrder: img.sortOrder,
    })),
    owner: portfolio.owner,
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt,
  })
}
