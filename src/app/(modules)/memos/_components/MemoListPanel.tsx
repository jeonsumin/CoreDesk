'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { NotepadText, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CountBadge } from '@/components/layout/Panel'
import { parseMemoSearchParams } from '@/lib/memo/validation'
import { cn } from '@/lib/utils'

type MemoItem = {
  id: string
  title: string
  updatedAt: string
}

// 좌측 메모 목록. 검색은 기존과 같이 GET /memos?q= 로 보내 서버에서 거르고, 목록도 같은 q로 맞춘다
export function MemoListPanel({
  memos,
  canWrite,
}: {
  memos: MemoItem[]
  canWrite: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { q } = parseMemoSearchParams({ q: searchParams.get('q') ?? undefined })

  const matchedId = pathname.match(/^\/memos\/([^/]+)/)?.[1]
  const activeId = matchedId === 'new' ? undefined : matchedId
  const visible = q
    ? memos.filter((memo) => memo.title.includes(q) || memo.id === activeId)
    : memos

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:flex">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center gap-2">
          <NotepadText className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">내 메모</h2>
          <CountBadge>{visible.length}</CountBadge>
        </div>
        <form action="/memos" className="relative" key={q ?? ''}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="제목으로 검색..."
            aria-label="메모 제목 검색"
            className={cn('h-9 pl-9', q && 'pr-9')}
          />
          {q && (
            <Link
              href="/memos"
              aria-label="검색 초기화"
              title="검색 초기화"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </Link>
          )}
        </form>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            {q
              ? '검색된 메모가 없습니다.'
              : canWrite
                ? '아직 작성한 메모가 없습니다.'
                : '등록된 메모가 없습니다'}
            {canWrite && (
              <Link
                href="/memos/new"
                className="mt-3 block font-medium text-primary hover:underline"
              >
                새 메모 작성하기
              </Link>
            )}
          </div>
        ) : (
          visible.map((memo) => {
            const active = memo.id === activeId
            return (
              <Link
                key={memo.id}
                href={`/memos/${memo.id}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-lg px-3 py-2.5 transition-colors',
                  active ? 'bg-sidebar-accent' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'block truncate text-sm font-semibold',
                    active && 'text-primary',
                  )}
                >
                  {memo.title}
                </span>
                <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 tabular-nums">{memo.updatedAt}</span>
                </span>
              </Link>
            )
          })
        )}
      </div>
    </aside>
  )
}
