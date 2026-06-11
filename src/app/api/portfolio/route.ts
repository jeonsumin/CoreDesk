import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === 'string')
}

export async function GET(req: NextRequest) {
  const portfolios = await prisma.portfolio.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      title: true,
      techSpecs: true,
      thumbnailFileId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const base = req.nextUrl.origin

  const data = portfolios.map((p) => ({
    id: p.id,
    title: p.title,
    tags: parseTags(p.techSpecs),
    thumbnailUrl: p.thumbnailFileId
      ? `${base}/api/portfolio/images/${p.thumbnailFileId}`
      : null,
    createdAt: p.createdAt,
  }))

  return NextResponse.json(data)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
