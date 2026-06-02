import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MemoForm } from '../_components/MemoForm'

type Props = {
  searchParams: Promise<{ projectId?: string }>
}

export const dynamic = 'force-dynamic'

export default async function NewMemoPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const params = await searchParams
  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    select: { id: true, name: true },
    orderBy: { updatedAt: 'desc' },
  })

  const defaultProjectId = projects.some(
    (project) => project.id === params.projectId,
  )
    ? params.projectId
    : undefined

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/memos"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft size={14} />
          메모 목록
        </Link>
        <div>
          <h1 className="text-2xl font-bold">새 메모</h1>
          <p className="text-sm text-muted-foreground">
            블록 기반 에디터로 메모를 작성합니다.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {defaultProjectId ? '프로젝트 메모 작성' : '메모 작성'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemoForm projects={projects} defaultProjectId={defaultProjectId} />
        </CardContent>
      </Card>
    </div>
  )
}
