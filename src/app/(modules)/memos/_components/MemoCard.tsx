import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { MarkdownPreview } from '@/components/memo/MarkdownPreview'
import { getMemoPreviewContent } from '@/lib/memo/blocks'
import type { Memo } from '@/types'

type Props = {
  memo: Memo
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function MemoCard({ memo }: Props) {
  const previewContent = getMemoPreviewContent(memo.content, 4)

  return (
    <article className="relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="min-w-0 space-y-1.5">
        {/* 제목 링크가 카드 전체를 덮어 카드 어디를 눌러도 상세로 이동 */}
        <h3 className="truncate text-sm font-semibold">
          <Link
            href={`/memos/${memo.id}`}
            className="after:absolute after:inset-0 after:rounded-xl"
          >
            {memo.title}
          </Link>
        </h3>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <CalendarDays className="size-3" />
            {formatDate(memo.updatedAt)}
          </span>
        </div>
      </div>
      <div className="max-h-24 overflow-hidden rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground">
        <MarkdownPreview content={previewContent} compact />
      </div>
    </article>
  )
}
