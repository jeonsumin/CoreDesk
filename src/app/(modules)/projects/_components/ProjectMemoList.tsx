import Link from 'next/link'
import { CalendarDays, FileText, Plus, UserRound } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MarkdownPreview } from '@/components/memo/MarkdownPreview'
import { getMemoPreviewContent } from '@/lib/memo/blocks'

type ProjectMemo = {
  id: string
  title: string
  content: string
  updatedAt: Date
  owner: {
    id: string
    name: string
    email: string
  }
}

type Props = {
  projectId: string
  memos: ProjectMemo[]
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function ProjectMemoList({ projectId, memos }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">연동된 메모</h2>
          <p className="text-sm text-muted-foreground">
            이 프로젝트에 연결된 메모 {memos.length}개
          </p>
        </div>
        <Link
          href={`/memos/new?projectId=${projectId}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          <Plus size={14} />
          메모 작성
        </Link>
      </div>

      {memos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            이 프로젝트에 연결된 메모가 없습니다.
          </p>
          <Link
            href={`/memos/new?projectId=${projectId}`}
            className={buttonVariants()}
          >
            첫 메모 작성하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {memos.map((memo) => (
            <Card key={memo.id} size="sm">
              <CardHeader>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate">
                    <Link href={`/memos/${memo.id}`} className="hover:underline">
                      {memo.title}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserRound size={12} />
                      {memo.owner.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} />
                      {formatDate(memo.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-28 overflow-hidden text-muted-foreground">
                  <MarkdownPreview
                    content={getMemoPreviewContent(memo.content, 5)}
                    compact
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
