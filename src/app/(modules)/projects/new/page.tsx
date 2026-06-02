import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectForm } from '../_components/ProjectForm'

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">새 프로젝트</h1>
        <p className="text-muted-foreground">프로젝트 정보를 입력하세요</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </div>
  )
}
