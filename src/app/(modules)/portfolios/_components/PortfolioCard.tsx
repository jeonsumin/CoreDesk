import Link from 'next/link'
import { ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toStringArray } from '@/lib/json-array'
import type { PortfolioWithAssets } from '@/types'

type Props = {
  portfolio: PortfolioWithAssets
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function PortfolioCard({ portfolio }: Props) {
  const coverFile = portfolio.thumbnailFile ?? portfolio.images[0]?.file ?? null
  const techSpecs = toStringArray(portfolio.techSpecs)
  const visibleTechSpecs = techSpecs.slice(0, 4)
  const hiddenTechSpecCount = techSpecs.length - visibleTechSpecs.length

  return (
    <Link
      href={`/portfolios/${portfolio.id}`}
      className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-video overflow-hidden border-b bg-muted">
        {coverFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/drive/${coverFile.id}`}
            alt={portfolio.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/70">
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold">{portfolio.title}</p>
          {portfolio.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {portfolio.description}
            </p>
          )}
        </div>

        {visibleTechSpecs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTechSpecs.map((techSpec) => (
              <Badge key={techSpec} variant="secondary">
                {techSpec}
              </Badge>
            ))}
            {hiddenTechSpecCount > 0 && (
              <Badge variant="outline">+{hiddenTechSpecCount}</Badge>
            )}
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">스크린샷</p>
            <p className="font-bold tabular-nums">{portfolio.images.length}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">URI</p>
            <p className="font-bold tabular-nums">{portfolio.links.length}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          수정일 {formatDate(portfolio.updatedAt)}
        </p>
      </div>
    </Link>
  )
}
