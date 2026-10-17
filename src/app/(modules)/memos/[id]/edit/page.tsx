import { notFound, redirect } from 'next/navigation'
import { PencilLine } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMenuAccess } from '@/lib/menu/access'
import { MemoForm } from '../../_components/MemoForm'
import { FormPanel } from '@/components/layout/FormPanel'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditMemoPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((await getMenuAccess('/memos')) !== 'WRITE') notFound()

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
    <FormPanel wide icon={<PencilLine />} title="메모 수정" description={memo.title}>
      <MemoForm projects={projects} memo={memo} />
    </FormPanel>
  )
}
