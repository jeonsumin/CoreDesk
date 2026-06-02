import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
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
import { MemoForm } from '../../_components/MemoForm'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditMemoPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const memo = await prisma.memo.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  })

  if (!memo) notFound()

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href={`/memos/${memo.id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft size={14} />
          메모 상세
        </Link>
        <div>
          <h1 className="text-2xl font-bold">메모 수정</h1>
          <p className="text-sm text-muted-foreground">{memo.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>수정 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <MemoForm projects={projects} memo={memo} />
        </CardContent>
      </Card>
    </div>
  )
}
