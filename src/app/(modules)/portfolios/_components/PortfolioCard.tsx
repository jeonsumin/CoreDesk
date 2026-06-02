import Link from 'next/link'
import { ExternalLink, ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Link href={`/portfolios/${portfolio.id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <div className="aspect-video overflow-hidden bg-muted">
          {coverFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/drive/${coverFile.id}`}
              alt={portfolio.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon size={36} />
            </div>
          )}
        </div>
        <CardHeader className="pb-1">
          <CardTitle className="line-clamp-2 text-base">
            {portfolio.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolio.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {portfolio.description}
            </p>
          )}
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
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(portfolio.updatedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <ExternalLink size={12} />
              {portfolio.links.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
