import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExternalLink, ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toStringArray } from '@/lib/json-array'
import { portfolioLinkTypeLabels } from '@/lib/portfolio/validation'
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{ id: string }>
}

function publicImageUrl(fileId: string): string {
  return `/api/portfolio/images/${fileId}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const portfolio = await prisma.portfolio.findFirst({
    where: { id, isPublic: true },
    select: { title: true, description: true },
  })
  if (!portfolio) return {}
  return {
    title: portfolio.title,
    description: portfolio.description ?? undefined,
  }
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { id } = await params

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, isPublic: true },
    include: {
      thumbnailFile: true,
      links: { orderBy: { sortOrder: 'asc' } },
      images: {
        orderBy: { sortOrder: 'asc' },
        include: { file: true },
      },
    },
  })

  if (!portfolio) notFound()

  const techSpecs = toStringArray(portfolio.techSpecs)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">{portfolio.title}</h1>
          {portfolio.description && (
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              {portfolio.description}
            </p>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          {/* Left column: thumbnail + screenshots */}
          <div className="space-y-8">
            {/* Thumbnail */}
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="aspect-video bg-muted">
                {portfolio.thumbnailFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicImageUrl(portfolio.thumbnailFile.id)}
                    alt={`${portfolio.title} 썸네일`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon size={48} />
                    <span className="text-sm">썸네일 없음</span>
                  </div>
                )}
              </div>
            </section>

            {/* Screenshots */}
            {portfolio.images.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">스크린샷</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {portfolio.images.map((image) => (
                    <a
                      key={image.id}
                      href={publicImageUrl(image.file.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicImageUrl(image.file.id)}
                        alt={image.file.name}
                        className="aspect-video w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column: tech specs + links */}
          <aside className="space-y-6">
            {/* Tech specs */}
            {techSpecs.length > 0 && (
              <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold">기술 스펙</h2>
                <div className="flex flex-wrap gap-1.5">
                  {techSpecs.map((spec) => (
                    <Badge key={spec} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Links */}
            {portfolio.links.length > 0 && (
              <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold">링크</h2>
                <div className="space-y-2">
                  {portfolio.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {link.label || portfolioLinkTypeLabels[link.type]}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {link.url}
                        </span>
                      </span>
                      <ExternalLink size={14} className="shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
