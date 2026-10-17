import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, PencilLine, Trash2, UserRound } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Panel } from '@/components/layout/Panel'
import { MarkdownPreview } from '@/components/memo/MarkdownPreview'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
import { deleteProjectMemoFormAction } from '../_actions/memo'
import { getProjectMemoContext } from '../_data'

type Props = {
  params: Promise<{ id: string; memoId: string }>
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function ProjectMemoDetailPage({ params }: Props) {
  const { id, memoId } = await params
  const { userId, project } = await getProjectMemoContext(id)

  const memo = await prisma.memo.findFirst({
    where: { id: memoId, projectId: id },
    include: {
      owner: { select: { id: true, name: true } },
    },
  })
  if (!memo) notFound()

  const canEdit = memo.ownerId === userId

  return (
    <Panel className="flex-1">
      {/* 문서 헤더: 프로젝트 메모 탭으로 돌아가기, 제목, 작성자·수정일, 액션 */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b px-6 py-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Link
            href={`/projects/${id}?tab=memos`}
            aria-label={`${project.name} 메모 목록`}
            title={`${project.name} 메모 목록`}
            className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'shrink-0' })}
          >
            <ArrowLeft />
          </Link>
          <div className="min-w-0 space-y-1.5">
            <h2 className="min-w-0 break-words text-xl font-bold">{memo.title}</h2>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserRound className="size-3.5" />
                {memo.owner.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatDate(memo.updatedAt)} 수정
              </span>
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 gap-1.5">
            <Link
              href={`/projects/${id}/memos/${memo.id}/edit`}
              aria-label="메모 수정"
              title="메모 수정"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            >
              <PencilLine />
            </Link>
            <form action={deleteProjectMemoFormAction.bind(null, id, memo.id)}>
              <Button
                variant="destructive"
                type="submit"
                size="icon"
                aria-label="메모 삭제"
                title="메모 삭제"
              >
                <Trash2 />
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <article className="mx-auto max-w-3xl">
          <MarkdownPreview content={memo.content} className="text-[15px] leading-7" />
        </article>
      </div>
    </Panel>
  )
}
