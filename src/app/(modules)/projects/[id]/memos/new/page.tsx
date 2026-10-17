import { FilePlus } from 'lucide-react'
import { MemoForm } from '@/components/memo/MemoForm'
import { FormPanel } from '@/components/layout/FormPanel'
import { createProjectMemo } from '../_actions/memo'
import { getProjectMemoContext } from '../_data'

type Props = {
  params: Promise<{ id: string }>
}

export default async function NewProjectMemoPage({ params }: Props) {
  const { id } = await params
  const { project } = await getProjectMemoContext(id)

  return (
    <FormPanel wide
      icon={<FilePlus />}
      title="프로젝트 메모 작성"
      description={`${project.name} 멤버와 공유되는 메모입니다. '/'를 입력하면 블록 종류를 바꿀 수 있습니다.`}
    >
      <MemoForm
        onSubmit={createProjectMemo.bind(null, id)}
        cancelHref={`/projects/${id}?tab=memos`}
      />
    </FormPanel>
  )
}
