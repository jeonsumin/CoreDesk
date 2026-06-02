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
import { Badge } from '@/components/ui/badge'
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

type TaskWithAssignee = Task & { assignee: User | null }

const priorityConfig: Record<
  Priority,
  {
    label: string
    className: string
  }
> = {
  HIGH: {
    label: '높음',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  MEDIUM: {
    label: '보통',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  LOW: {
    label: '낮음',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
}

const dueClassName = {
  overdue: 'border-red-200 bg-red-50 text-red-700',
  dueSoon: 'border-orange-200 bg-orange-50 text-orange-700',
  later: 'border-border bg-background text-muted-foreground',
  none: 'border-border bg-background text-muted-foreground',
}

type Props = {
  task: KanbanTaskModel<TaskWithAssignee>
  projectId: string
  members: User[]
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
        'group rounded-lg border bg-card p-3 shadow-sm transition-all select-none',
        canDrag &&
          'cursor-grab hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing active:opacity-70',
        !canDrag && 'cursor-default',
        task.status === 'DONE' && 'bg-card/70',
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
            <Badge className={cn('border text-xs', priority.className)}>
              {priority.label}
            </Badge>
            <Badge
              className={cn('border text-xs', dueClassName[task.dueState.bucket])}
            >
              <CalendarClock className="size-3" />
              {task.dueState.label}
            </Badge>
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
        <div className="min-w-0 text-xs text-muted-foreground">
          {task.assignee ? (
            <span className="truncate">{task.assignee.name}</span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" />
              미배정
            </span>
          )}
        </div>
        {task.assignee && (
          <Avatar size="sm" title={task.assignee.name}>
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {assigneeInitial}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </article>
  )
}
