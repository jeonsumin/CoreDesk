'use client'

import { useState, useTransition } from 'react'
import { FormActions } from '@/components/form/FormActions'
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

const priorityItems = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
]

const statusItems = [
  { value: 'TODO', label: '할 일' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'REVIEW', label: '검토' },
  { value: 'DONE', label: '완료' },
]

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

  const assigneeItems = [
    { value: '', label: '미배정' },
    // 비활성화된 담당자도 기존 배정 값은 보여준다
    ...(task?.assigneeId && !members.some((m) => m.id === task.assigneeId)
      ? [{ value: task.assigneeId, label: `${task.assignee?.name ?? '알 수 없음'} (비활성)` }]
      : []),
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ]

  const formatDate = (date: Date | null | undefined) =>
    date ? new Date(date).toISOString().split('T')[0] : ''

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label className="font-semibold" htmlFor="title">태스크명 *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={task?.title}
          placeholder="태스크명 입력"
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="font-semibold" htmlFor="description">설명</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={task?.description ?? ''}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="priority">우선순위</Label>
          <Select
            name="priority"
            items={priorityItems}
            defaultValue={task?.priority ?? 'MEDIUM'}
          >
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="status">상태</Label>
          <Select
            name="status"
            items={statusItems}
            defaultValue={task?.status ?? defaultStatus ?? 'TODO'}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="assigneeId">담당자</Label>
          <Select
            name="assigneeId"
            items={assigneeItems}
            defaultValue={task?.assigneeId ?? ''}
          >
            <SelectTrigger id="assigneeId" className="w-full">
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              {assigneeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="dueDate">마감일</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={formatDate(task?.dueDate)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <FormActions
        isPending={isPending}
        submitLabel={task ? '변경사항 저장' : '태스크 추가'}
      />
    </form>
  )
}
