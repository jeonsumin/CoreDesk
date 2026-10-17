import { FolderPlus } from 'lucide-react'
import { FormPanel } from '@/components/layout/FormPanel'
import { ProjectForm } from '../_components/ProjectForm'

export default function NewProjectPage() {
  return (
    <FormPanel
      icon={<FolderPlus />}
      title="새 프로젝트 만들기"
      description="프로젝트를 만들면 내가 PM으로 등록됩니다. 팀원은 만든 뒤 멤버 관리에서 초대하세요."
    >
      <ProjectForm />
    </FormPanel>
  )
}
