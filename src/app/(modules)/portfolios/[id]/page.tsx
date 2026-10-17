import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, Panel } from '@/components/layout/Panel'
import { auth } from '@/lib/auth'
import { toStringArray } from '@/lib/json-array'
import { portfolioLinkTypeLabels } from '@/lib/portfolio/validation'
import { prisma } from '@/lib/prisma'
import { projectColor } from '@/lib/projects/appearance'
import { cn } from '@/lib/utils'
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
    <Panel className="flex-1">
      {/* 포트폴리오 헤더: 아이콘, 제목, 메타, 액션 */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link
            href="/portfolios"
            aria-label="목록으로"
            title="목록으로"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'lg:hidden')}
          >
            <ArrowLeft />
          </Link>
          {portfolio.thumbnailFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl(portfolio.thumbnailFile.id)}
              alt=""
              className="size-12 shrink-0 rounded-xl border object-cover"
            />
          ) : (
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white',
                projectColor(portfolio.id),
              )}
            >
              {portfolio.title.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{portfolio.title}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FolderOpen className="size-3.5" />
                {portfolio.driveFolder.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {portfolio.updatedAt.toISOString().slice(0, 10)} 수정
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <PortfolioPublicToggle id={portfolio.id} isPublic={portfolio.isPublic} />
          <Link
            href={`/drive?folderId=${portfolio.driveFolderId}`}
            aria-label="드라이브 폴더 열기"
            title="드라이브 폴더 열기"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
          >
            <FolderOpen />
          </Link>
          <Link
            href={`/portfolios/${portfolio.id}/edit`}
            aria-label="포트폴리오 수정"
            title="포트폴리오 수정"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
          >
            <Pencil />
          </Link>
          <PortfolioDeleteButton id={portfolio.id} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div className="space-y-8">
            <div className="aspect-video overflow-hidden rounded-xl border bg-muted">
              {portfolio.thumbnailFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(portfolio.thumbnailFile.id)}
                  alt={`${portfolio.title} 썸네일`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/70">
                  <ImageIcon className="size-12" />
                </div>
              )}
            </div>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                스크린샷
                <span className="text-sm font-normal text-muted-foreground tabular-nums">
                  {portfolio.images.length}개
                </span>
              </h3>
              {portfolio.images.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon />}
                  title="등록된 스크린샷이 없습니다."
                  action={
                    <Link
                      href={`/portfolios/${portfolio.id}/edit`}
                      className={cn(buttonVariants({ variant: 'outline' }))}
                    >
                      스크린샷 추가
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {portfolio.images.map((image) => (
                    <a
                      key={image.id}
                      href={fileUrl(image.file.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
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

          <div className="divide-y xl:border-l xl:pl-8">
            <section className="space-y-3 pb-6">
              <h3 className="text-base font-semibold">설명</h3>
              {portfolio.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {portfolio.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">설명이 없습니다.</p>
              )}
            </section>

            <section className="space-y-3 py-6">
              <h3 className="text-base font-semibold">기술 스펙</h3>
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

            <section className="space-y-2 pt-6">
              <h3 className="text-base font-semibold">URI</h3>
              {portfolio.links.length > 0 ? (
                <div className="-mx-3">
                  {portfolio.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {link.label || portfolioLinkTypeLabels[link.type]}
                        </span>
                        <span className="block truncate text-xs text-primary">
                          {link.url}
                        </span>
                      </span>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">등록된 URI가 없습니다.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </Panel>
  )
}
