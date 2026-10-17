import { notFound } from 'next/navigation'
import { PencilLine } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { MemoForm } from '@/components/memo/MemoForm'
import { FormPanel } from '@/components/layout/FormPanel'
import { updateProjectMemo } from '../../_actions/memo'
import { getProjectMemoContext } from '../../_data'

type Props = {
  params: Promise<{ id: string; memoId: string }>
}

export default async function EditProjectMemoPage({ params }: Props) {
  const { id, memoId } = await params
  const { userId } = await getProjectMemoContext(id)

  const memo = await prisma.memo.findFirst({
    where: { id: memoId, projectId: id, ownerId: userId },
  })
  if (!memo) notFound()

  return (
    <FormPanel wide icon={<PencilLine />} title="프로젝트 메모 수정" description={memo.title}>
      <MemoForm
        memo={memo}
        onSubmit={updateProjectMemo.bind(null, id, memo.id)}
        cancelHref={`/projects/${id}/memos/${memo.id}`}
      />
    </FormPanel>
  )
}
