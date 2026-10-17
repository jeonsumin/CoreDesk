'use client'

import { useState, useTransition } from 'react'
import {
  AlignLeft,
  CalendarClock,
  GripVertical,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { KanbanTaskModel } from '@/lib/projects/kanban-board'
import { TaskForm } from './TaskForm'
import { deleteTask } from '../_actions/task'
import type { Task, User, Priority } from '@/types'

type TaskWithAssignee = Task & {
  assignee: Pick<User, 'id' | 'name' | 'email'> | null
}

const priorityConfig: Record<
  Priority,
  {
    label: string
    className: string
  }
> = {
  HIGH: {
    label: '높음',
    className: 'border-red-200 bg-red-50 text-red-600',
  },
  MEDIUM: {
    label: '보통',
    className: 'border-orange-200 bg-orange-50 text-orange-600',
  },
  LOW: {
    label: '낮음',
    className: 'border-border bg-muted text-muted-foreground',
  },
}

const dueClassName = {
  overdue: 'border-red-200 bg-red-50 text-red-600',
  dueSoon: 'border-orange-200 bg-orange-50 text-orange-600',
  later: 'border-border bg-card text-muted-foreground',
  none: 'border-border bg-card text-muted-foreground',
}

const chipClassName =
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold'

type Props = {
  task: KanbanTaskModel<TaskWithAssignee>
  projectId: string
  members: Pick<User, 'id' | 'name'>[]
  canManageTasks: boolean
  canDrag: boolean
  onDragStart: (taskId: string) => void
}

export function KanbanCard({
  task,
  projectId,
  members,
  canManageTasks,
  canDrag,
  onDragStart,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const priority = priorityConfig[task.priority]
  const assigneeInitial = task.assignee?.name.charAt(0) ?? '?'

  return (
    <article
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(task.id)
      }}
      className={cn(
        'group rounded-xl border bg-card p-3 shadow-sm transition-shadow select-none hover:shadow-md',
        canDrag && 'cursor-grab active:cursor-grabbing active:opacity-70',
        !canDrag && 'cursor-default',
        task.status === 'DONE' && 'opacity-70',
      )}
    >
      <div className="mb-2 flex items-start gap-2">
        {canDrag && (
          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold leading-snug">
            {task.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn(chipClassName, priority.className)}>
              {priority.label}
            </span>
            <span className={cn(chipClassName, dueClassName[task.dueState.bucket])}>
              <CalendarClock className="size-3" />
              {task.dueState.label}
            </span>
          </div>
        </div>
        {canManageTasks && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="태스크 수정"
                    title="태스크 수정"
                    onClick={(e) => e.stopPropagation()}
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
              size="icon-xs"
              aria-label="태스크 삭제"
              title="태스크 삭제"
              className="hover:text-destructive"
              onClick={() => startTransition(() => deleteTask(task.id, projectId))}
              disabled={isPending}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {task.description && (
        <div className="mb-3 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <AlignLeft className="mt-0.5 size-3.5 shrink-0" />
          <p className="line-clamp-2 break-words">{task.description}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {task.assignee ? task.assignee.name : '미배정'}
        </span>
        {task.assignee ? (
          <Avatar size="sm" title={task.assignee.name}>
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {assigneeInitial}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            title="미배정"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30"
          >
            <UserRound className="size-3 text-muted-foreground/60" />
          </span>
        )}
      </div>
    </article>
  )
}
