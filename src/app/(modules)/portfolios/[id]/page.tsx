import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { toStringArray } from '@/lib/json-array'
import { portfolioLinkTypeLabels } from '@/lib/portfolio/validation'
import { prisma } from '@/lib/prisma'
import { PortfolioDeleteButton } from '../_components/PortfolioDeleteButton'
import { PortfolioPublicToggle } from '../_components/PortfolioPublicToggle'

type Props = {
  params: Promise<{ id: string }>
}

function fileUrl(id: string): string {
  return `/api/drive/${id}`
}

export default async function PortfolioDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const portfolio = await prisma.portfolio.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      driveFolder: true,
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/portfolios"
            className={buttonVariants({ variant: 'outline', size: 'icon' })}
            aria-label="목록으로"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{portfolio.title}</h1>
            <p className="text-sm text-muted-foreground">
              Drive 폴더: {portfolio.driveFolder.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PortfolioPublicToggle id={portfolio.id} isPublic={portfolio.isPublic} />
          <Link
            href={`/drive?folderId=${portfolio.driveFolderId}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <FolderOpen size={14} />
            드라이브 폴더
          </Link>
          <Link href={`/portfolios/${portfolio.id}/edit`} className={buttonVariants()}>
            <Pencil size={14} />
            수정
          </Link>
          <PortfolioDeleteButton id={portfolio.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-video bg-muted">
              {portfolio.thumbnailFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(portfolio.thumbnailFile.id)}
                  alt={`${portfolio.title} 썸네일`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">스크린샷</h2>
              <span className="text-sm text-muted-foreground">
                {portfolio.images.length}개
              </span>
            </div>
            {portfolio.images.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <ImageIcon
                  size={36}
                  className="mx-auto mb-3 text-muted-foreground"
                />
                <p className="mb-4 text-sm text-muted-foreground">
                  등록된 스크린샷이 없습니다.
                </p>
                <Link
                  href={`/portfolios/${portfolio.id}/edit`}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  스크린샷 추가
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {portfolio.images.map((image) => (
                  <a
                    key={image.id}
                    href={fileUrl(image.file.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(image.file.id)}
                      alt={image.file.name}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-base font-semibold">설명</h2>
            {portfolio.description ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {portfolio.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">설명이 없습니다.</p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-base font-semibold">기술 스펙</h2>
            {techSpecs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {techSpecs.map((techSpec) => (
                  <Badge key={techSpec} variant="secondary">
                    {techSpec}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">등록된 태그가 없습니다.</p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-base font-semibold">URI</h2>
            {portfolio.links.length > 0 ? (
              <div className="space-y-2">
                {portfolio.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
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
            ) : (
              <p className="text-sm text-muted-foreground">등록된 URI가 없습니다.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
