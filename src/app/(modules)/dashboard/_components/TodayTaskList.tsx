import Link from 'next/link'
import { ChevronDown, ChevronsUp, Circle, CircleCheck, CircleDot, Equal, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectColor } from '@/lib/projects/appearance'
import type { Task, Project, Priority, TaskStatus } from '@/types'
import { DdayBadge } from '@/components/task/DdayBadge'

type TaskWithProject = Task & { project: Project }

type Props = {
  tasks: TaskWithProject[]
  title: string
  nowMs: number
}

const statusIcon: Record<TaskStatus, { label: string; icon: LucideIcon; className: string }> = {
  TODO: { label: '할 일', icon: Circle, className: 'text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', icon: CircleDot, className: 'text-blue-600' },
  DONE: { label: '완료', icon: CircleCheck, className: 'text-green-500' },
}

const priorityMeta: Record<Priority, { label: string; icon: LucideIcon; className: string }> = {
  HIGH: { label: '높음', icon: ChevronsUp, className: 'text-red-500' },
  MEDIUM: { label: '보통', icon: Equal, className: 'text-orange-500' },
  LOW: { label: '낮음', icon: ChevronDown, className: 'text-muted-foreground' },
}


export function TodayTaskList({ tasks, title, nowMs }: Props) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h3 className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
        {title}
        <span className="rounded-md bg-muted px-1.5 text-foreground tabular-nums">{tasks.length}</span>
      </h3>
      {tasks.map((task) => {
        const status = statusIcon[task.status]
        const priority = priorityMeta[task.priority]
        const StatusIcon = status.icon
        const PriorityIcon = priority.icon
        return (
          <Link
            key={task.id}
            href={`/projects/${task.projectId}?tab=board`}
            className="flex min-h-14 items-center gap-3 border-b px-4 py-2 transition-colors hover:bg-muted/50"
          >
            <StatusIcon
              className={cn('size-4 shrink-0', status.className)}
              aria-label={status.label}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <span className="mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/40 px-2 text-xs text-primary">
                <span className={cn('size-2 shrink-0 rounded-sm', projectColor(task.projectId))} />
                <span className="truncate">{task.project.name}</span>
              </span>
            </div>
            <PriorityIcon
              className={cn('size-4 shrink-0', priority.className)}
              aria-label={`우선순위 ${priority.label}`}
            />
            <DdayBadge dueDate={task.dueDate} nowMs={nowMs} />
          </Link>
        )
      })}
    </div>
  )
}
