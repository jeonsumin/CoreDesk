import { notFound, redirect } from 'next/navigation'
import { PencilLine } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MemoForm } from '@/components/memo/MemoForm'
import { FormPanel } from '@/components/layout/FormPanel'
import { updateMemo } from '../../_actions/memo'

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
      projectId: null,
    },
  })

  if (!memo) notFound()

  return (
    <FormPanel wide icon={<PencilLine />} title="메모 수정" description={memo.title}>
      <MemoForm
        memo={memo}
        onSubmit={updateMemo.bind(null, memo.id)}
        cancelHref={`/memos/${memo.id}`}
      />
    </FormPanel>
  )
}
