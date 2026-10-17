import { notFound } from 'next/navigation'
import { FilePlus } from 'lucide-react'
import { getMenuAccess } from '@/lib/menu/access'
import { MemoForm } from '@/components/memo/MemoForm'
import { FormPanel } from '@/components/layout/FormPanel'
import { createMemo } from '../_actions/memo'

export default async function NewMemoPage() {
  if ((await getMenuAccess('/memos')) !== 'WRITE') notFound()

  return (
    <FormPanel wide
      icon={<FilePlus />}
      title="새 메모 작성"
      description="블록 기반 에디터로 메모를 작성합니다. '/'를 입력하면 블록 종류를 바꿀 수 있습니다."
    >
      <MemoForm onSubmit={createMemo} cancelHref="/memos" />
    </FormPanel>
  )
}
