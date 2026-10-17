'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { TaskStatusSelect } from './TaskStatusSelect'
import { TaskForm } from './TaskForm'
import { deleteTask } from '../_actions/task'
import type { Task, User, Priority } from '@/types'
import { DdayBadge } from '@/components/task/DdayBadge'

const priorityClassName: Record<Priority, string> = {
  HIGH: 'border-red-200 bg-red-50 text-red-600',
  MEDIUM: 'border-orange-200 bg-orange-50 text-orange-600',
  LOW: 'border-border bg-muted text-muted-foreground',
}

const chipClassName = 'rounded-md border px-2 py-0.5 text-xs font-semibold'

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


export function TaskRow({ task, projectId, members }: TaskRowProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(() => {
      deleteTask(task.id, projectId)
    })
  }

  return (
    <div className="flex min-h-14 items-center gap-3 border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.assignee && (
          <p className="text-xs text-muted-foreground">{task.assignee.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <DdayBadge dueDate={task.dueDate} nowMs={new Date().getTime()} />
        <span className={cn(chipClassName, priorityClassName[task.priority])}>
          {priorityLabel[task.priority]}
        </span>
        <TaskStatusSelect
          taskId={task.id}
          projectId={projectId}
          currentStatus={task.status}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="태스크 수정"
                title="태스크 수정"
              >
                <Pencil />
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
          size="icon-sm"
          aria-label="태스크 삭제"
          title="태스크 삭제"
          className="hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
