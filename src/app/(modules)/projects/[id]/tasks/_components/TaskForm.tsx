'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createTask, updateTask } from '../_actions/task'
import type { Task, User, TaskStatus } from '@/types'

type TaskFormProps = {
  projectId: string
  task?: Task & { assignee?: Pick<User, 'name'> | null }
  members: Pick<User, 'id' | 'name'>[]
  onSuccess?: () => void
  defaultStatus?: TaskStatus
}

export function TaskForm({
  projectId,
  task,
  members,
  onSuccess,
  defaultStatus,
}: TaskFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = task
        ? await updateTask(task.id, projectId, formData)
        : await createTask(projectId, formData)
      if (result?.error) setError(result.error)
      else onSuccess?.()
    })
  }

  const formatDate = (date: Date | null | undefined) =>
    date ? new Date(date).toISOString().split('T')[0] : ''

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">태스크명 *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={task?.title}
          placeholder="태스크명 입력"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={task?.description ?? ''}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">우선순위</Label>
          <Select name="priority" defaultValue={task?.priority ?? 'MEDIUM'}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HIGH">높음</SelectItem>
              <SelectItem value="MEDIUM">보통</SelectItem>
              <SelectItem value="LOW">낮음</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">상태</Label>
          <Select name="status" defaultValue={task?.status ?? defaultStatus ?? 'TODO'}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODO">할 일</SelectItem>
              <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
              <SelectItem value="REVIEW">검토</SelectItem>
              <SelectItem value="DONE">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assigneeId">담당자</Label>
          <Select name="assigneeId" defaultValue={task?.assigneeId ?? ''}>
            <SelectTrigger id="assigneeId">
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">미배정</SelectItem>
              {task?.assigneeId && !members.some((m) => m.id === task.assigneeId) && (
                <SelectItem value={task.assigneeId}>
                  {task.assignee?.name ?? '알 수 없음'} (비활성)
                </SelectItem>
              )}
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">마감일</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={formatDate(task?.dueDate)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '저장 중...' : task ? '수정' : '태스크 추가'}
      </Button>
    </form>
  )
}
