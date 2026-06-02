'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
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
        <Select name="status" defaultValue={project?.status ?? 'IN_PROGRESS'}>
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
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '저장 중...' : project ? '수정하기' : '프로젝트 생성'}
      </Button>
    </form>
  )
}
