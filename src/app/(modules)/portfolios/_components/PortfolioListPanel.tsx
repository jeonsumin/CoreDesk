'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BriefcaseBusiness, ChevronRight, ExternalLink, ImageIcon, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CountBadge } from '@/components/layout/Panel'
import { projectColor } from '@/lib/projects/appearance'
import { cn } from '@/lib/utils'

type PortfolioItem = {
  id: string
  title: string
  thumbnailFileId: string | null
  imageCount: number
  linkCount: number
}

export function PortfolioListPanel({ portfolios }: { portfolios: PortfolioItem[] }) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')

  const matchedId = pathname.match(/^\/portfolios\/([^/]+)/)?.[1]
  const activeId = matchedId === 'new' ? undefined : matchedId
  const visible = portfolios.filter((p) =>
    p.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:flex">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">포트폴리오</h2>
          <CountBadge>{visible.length}</CountBadge>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="포트폴리오 검색..."
            aria-label="포트폴리오 검색"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            {query ? '검색 결과가 없습니다.' : '아직 등록된 포트폴리오가 없습니다.'}
            <Link
              href="/portfolios/new"
              className="mt-3 block font-medium text-primary hover:underline"
            >
              새 포트폴리오 만들기
            </Link>
          </div>
        ) : (
          visible.map((portfolio) => {
            const active = portfolio.id === activeId
            return (
              <Link
                key={portfolio.id}
                href={`/portfolios/${portfolio.id}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  active ? 'bg-sidebar-accent' : 'hover:bg-muted',
                )}
              >
                {portfolio.thumbnailFileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/drive/${portfolio.thumbnailFileId}`}
                    alt=""
                    className="size-10 shrink-0 rounded-lg border object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
                      projectColor(portfolio.id),
                    )}
                  >
                    {portfolio.title.charAt(0)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm font-semibold',
                      active && 'text-primary',
                    )}
                  >
                    {portfolio.title}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ImageIcon className="size-3" />
                    {portfolio.imageCount}
                    <ExternalLink className="ml-1 size-3" />
                    {portfolio.linkCount}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            )
          })
        )}
      </div>
    </aside>
  )
}
