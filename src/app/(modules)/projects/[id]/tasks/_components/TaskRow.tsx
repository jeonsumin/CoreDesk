'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TaskStatusSelect } from './TaskStatusSelect'
import { TaskForm } from './TaskForm'
import { deleteTask } from '../_actions/task'
import type { Task, User, Priority } from '@/types'

const priorityVariant: Record<
  Priority,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
}

const priorityLabel: Record<Priority, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}

type TaskRowProps = {
  task: Task & { assignee: Pick<User, 'id' | 'name' | 'email'> | null }
  projectId: string
  members: Pick<User, 'id' | 'name'>[]
}

function DdayBadge({ dueDate }: { dueDate: Date | null }) {
  if (!dueDate) return null
  const now = new Date()
  const diff = Math.ceil(
    (new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diff < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        D+{Math.abs(diff)} 초과
      </Badge>
    )
  }
  if (diff <= 3) {
    return (
      <Badge className="text-xs bg-orange-500 hover:bg-orange-500 text-white">
        D-{diff}
      </Badge>
    )
  }
  return <span className="text-xs text-muted-foreground">D-{diff}</span>
}

export function TaskRow({ task, projectId, members }: TaskRowProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(() => {
      deleteTask(task.id, projectId)
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.assignee && (
          <p className="text-xs text-muted-foreground">{task.assignee.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <DdayBadge dueDate={task.dueDate} />
        <Badge variant={priorityVariant[task.priority]} className="text-xs">
          {priorityLabel[task.priority]}
        </Badge>
        <TaskStatusSelect
          taskId={task.id}
          projectId={projectId}
          currentStatus={task.status}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="ghost" size="sm">
                수정
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>태스크 수정</DialogTitle>
            </DialogHeader>
            <TaskForm
              projectId={projectId}
              task={task}
              members={members}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          삭제
        </Button>
      </div>
    </div>
  )
}
