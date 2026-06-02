import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FolderKanban, PencilLine, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MarkdownPreview } from '@/components/memo/MarkdownPreview'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteMemoFormAction } from '../_actions/memo'

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

  const canEdit = memo.ownerId === session.user.id

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            href="/memos"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ArrowLeft size={14} />
            메모 목록
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{memo.title}</h1>
              {memo.project && <Badge variant="outline">프로젝트</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {memo.owner.name} 작성 · {formatDate(memo.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link
              href={`/memos/${memo.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <PencilLine size={14} />
              수정
            </Link>
          )}
          {memo.project && (
            <Link
              href={`/projects/${memo.project.id}?tab=memos`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <FolderKanban size={14} />
              프로젝트 메모
            </Link>
          )}
          {canEdit && (
            <form action={deleteMemoFormAction.bind(null, memo.id)}>
              <Button variant="destructive" type="submit">
                <Trash2 size={14} />
                삭제
              </Button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>내용</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownPreview content={memo.content} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>연결 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">작성자</p>
            <p>{memo.owner.name}</p>
          </div>
          {memo.project && (
            <div>
              <p className="text-xs text-muted-foreground">프로젝트</p>
              <Link
                href={`/projects/${memo.project.id}?tab=memos`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {memo.project.name}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
