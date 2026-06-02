import Link from 'next/link'
import { CalendarDays, FolderKanban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MarkdownPreview } from '@/components/memo/MarkdownPreview'
import { getMemoPreviewContent } from '@/lib/memo/blocks'
import type { MemoWithProject } from '@/types'

type Props = {
  memo: MemoWithProject
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
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate">
              <Link href={`/memos/${memo.id}`} className="hover:underline">
                {memo.title}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {formatDate(memo.updatedAt)}
              </span>
              {memo.project && (
                <span className="inline-flex items-center gap-1">
                  <FolderKanban size={12} />
                  {memo.project.name}
                </span>
              )}
            </div>
          </div>
          {memo.project && <Badge variant="outline">프로젝트</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-24 overflow-hidden text-muted-foreground">
          <MarkdownPreview content={previewContent} compact />
        </div>
      </CardContent>
    </Card>
  )
}
