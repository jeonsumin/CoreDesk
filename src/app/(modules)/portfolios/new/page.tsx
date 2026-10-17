import { BriefcaseBusiness } from 'lucide-react'
import { FormPanel } from '@/components/layout/FormPanel'
import { PortfolioForm } from '../_components/PortfolioForm'

export default function NewPortfolioPage() {
  return (
    <FormPanel
      icon={<BriefcaseBusiness />}
      title="새 포트폴리오 만들기"
      description="포트폴리오를 만들면 이미지를 보관할 드라이브 폴더가 함께 생성됩니다."
    >
      <PortfolioForm />
    </FormPanel>
  )
}
