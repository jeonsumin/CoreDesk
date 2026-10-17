import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, PencilLine, Trash2, UserRound } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Panel } from '@/components/layout/Panel'
import { MarkdownPreview } from '@/components/memo/MarkdownPreview'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMenuAccess } from '@/lib/menu/access'
import { deleteMemoFormAction } from '../_actions/memo'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ id: string }>
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

export default async function MemoDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const memo = await prisma.memo.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { project: { members: { some: { userId: session.user.id } } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  })

  if (!memo) notFound()

  const canEdit =
    memo.ownerId === session.user.id &&
    (await getMenuAccess('/memos')) === 'WRITE'

  return (
    <Panel className="flex-1">
      {/* 문서 헤더: 제목, 프로젝트 태그, 작성자·수정일, 액션 */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b px-6 py-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* 좁은 화면에서는 좌측 목록이 숨겨지므로 목록으로 돌아가는 버튼 제공 */}
          <Link
            href="/memos"
            aria-label="메모 목록"
            title="메모 목록"
            className={buttonVariants({
              variant: 'ghost',
              size: 'icon',
              className: 'shrink-0 lg:hidden',
            })}
          >
            <ArrowLeft />
          </Link>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-words text-xl font-bold">{memo.title}</h2>
              {memo.project && (
                <Link
                  href={`/projects/${memo.project.id}?tab=memos`}
                  title="프로젝트 메모 보기"
                  className="rounded-full border border-primary/40 px-2 text-xs text-primary transition-colors hover:bg-primary/10"
                >
                  {memo.project.name}
                </Link>
              )}
            </div>
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
              href={`/memos/${memo.id}/edit`}
              aria-label="메모 수정"
              title="메모 수정"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            >
              <PencilLine />
            </Link>
            <form action={deleteMemoFormAction.bind(null, memo.id)}>
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
