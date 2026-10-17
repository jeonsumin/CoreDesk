'use client'

import { useTransition } from 'react'
import { FormActions } from '@/components/form/FormActions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { projectStatusLabel } from '@/lib/projects/appearance'
import { createProject, updateProject } from '../_actions/project'
import type { Project } from '@/types'

type ProjectFormProps = {
  project?: Project
  onSuccess?: () => void
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const [isPending, startTransition] = useTransition()

  const action = project
    ? (formData: FormData) => {
        startTransition(async () => {
          await updateProject(project.id, formData)
          onSuccess?.()
        })
      }
    : createProject

  const formatDate = (date: Date | null | undefined) =>
    date ? new Date(date).toISOString().split('T')[0] : ''

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">프로젝트명 *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={project?.name}
          placeholder="프로젝트명을 입력하세요"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="key">프로젝트 키 *</Label>
        <Input
          id="key"
          name="key"
          defaultValue={project?.key ?? ''}
          placeholder="예: BB-CIC-WEB"
          className="uppercase"
          required
        />
        <p className="text-xs text-muted-foreground">이슈 키 앞에 붙습니다 (BB-CIC-WEB-6). 영문 대문자로 시작, 영문·숫자·하이픈 2~20자</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={project?.description ?? ''}
          placeholder="프로젝트 설명 (선택)"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">상태</Label>
        <Select
          name="status"
          defaultValue={project?.status ?? 'IN_PROGRESS'}
          items={projectStatusLabel}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="ON_HOLD">보류</SelectItem>
            <SelectItem value="CANCELLED">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">시작일</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={formatDate(project?.startDate)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">마감일</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={formatDate(project?.endDate)}
          />
        </div>
      </div>
      <FormActions
        isPending={isPending}
        submitLabel={project ? '변경사항 저장' : '프로젝트 만들기'}
        cancelHref={project ? `/projects/${project.id}` : '/projects'}
      />
    </form>
  )
}
