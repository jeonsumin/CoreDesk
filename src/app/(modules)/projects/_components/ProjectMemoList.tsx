import Link from 'next/link'
import { CalendarDays, FileText, Plus, UserRound } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CountBadge, EmptyState } from '@/components/layout/Panel'
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
      {/* 툴바: 개수 + 작성 (패널 안이므로 테두리 없음) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          연동된 메모
          <CountBadge>{memos.length}</CountBadge>
        </h3>
        <Link
          href={`/memos/new?projectId=${projectId}`}
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus data-icon="inline-start" />
          메모 작성
        </Link>
      </div>

      {memos.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="이 프로젝트에 연결된 메모가 없습니다."
          description="회의록, 결정 사항 등을 메모로 남겨 팀과 공유하세요."
          action={
            <Link
              href={`/memos/new?projectId=${projectId}`}
              className={buttonVariants()}
            >
              <Plus data-icon="inline-start" />첫 메모 작성하기
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {memos.map((memo) => (
            <Card
              key={memo.id}
              size="sm"
              className="shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate">
                    <Link href={`/memos/${memo.id}`} className="hover:text-primary">
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
