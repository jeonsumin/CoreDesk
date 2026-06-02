'use client'

import { useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateTaskStatus } from '../_actions/task'
import type { TaskStatus } from '@/types'

const statusLabel: Record<TaskStatus, string> = {
  TODO: '할 일',
  IN_PROGRESS: '진행 중',
  REVIEW: '검토',
  DONE: '완료',
}

type Props = {
  taskId: string
  projectId: string
  currentStatus: TaskStatus
}

export function TaskStatusSelect({ taskId, projectId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleChange = (value: unknown) => {
    if (typeof value !== 'string') return
    startTransition(() => {
      updateTaskStatus(taskId, projectId, value as TaskStatus)
    })
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-28 h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(statusLabel) as [TaskStatus, string][]).map(
          ([value, label]) => (
            <SelectItem key={value} value={value} className="text-xs">
              {label}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  )
}
