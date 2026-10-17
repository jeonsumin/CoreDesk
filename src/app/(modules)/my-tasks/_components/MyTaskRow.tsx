import Link from 'next/link'
import {
  ChevronDown,
  ChevronsUp,
  Circle,
  CircleCheck,
  CircleDot,
  Equal,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectColor } from '@/lib/projects/appearance'
import type { Priority, Project, Task, TaskStatus } from '@/types'
import { DdayBadge } from '@/components/task/DdayBadge'

const statusMeta: Record<TaskStatus, { label: string; icon: LucideIcon; className: string }> = {
  TODO: { label: '할 일', icon: Circle, className: 'text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', icon: CircleDot, className: 'text-blue-600' },
  REVIEW: { label: '검토', icon: Eye, className: 'text-orange-500' },
  DONE: { label: '완료', icon: CircleCheck, className: 'text-green-500' },
}

const statusBadgeClass: Record<TaskStatus, string> = {
  TODO: 'border-border bg-muted text-muted-foreground',
  IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700',
  REVIEW: 'border-orange-200 bg-orange-50 text-orange-600',
  DONE: 'border-green-200 bg-green-50 text-green-700',
}

const priorityMeta: Record<Priority, { label: string; icon: LucideIcon; className: string }> = {
  HIGH: { label: '높음', icon: ChevronsUp, className: 'text-red-500' },
  MEDIUM: { label: '보통', icon: Equal, className: 'text-orange-500' },
  LOW: { label: '낮음', icon: ChevronDown, className: 'text-muted-foreground' },
}


// 시안 backlog.html의 목록 행: 상태 아이콘 → 프로젝트 태그 → 제목 → 상태, 우선순위, D-day
export function MyTaskRow({
  task,
  nowMs,
}: {
  task: Task & { project: Project }
  nowMs: number
}) {
  const status = statusMeta[task.status]
  const priority = priorityMeta[task.priority]
  const StatusIcon = status.icon
  const PriorityIcon = priority.icon

  return (
    <div className="flex min-h-14 items-center gap-3 border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/50">
      <StatusIcon className={cn('size-4 shrink-0', status.className)} aria-label={status.label} />
      <span className="inline-flex max-w-40 shrink-0 items-center gap-1.5 rounded-full border border-primary/40 px-2 text-xs text-primary">
        <span className={cn('size-2 shrink-0 rounded-sm', projectColor(task.projectId))} />
        <span className="truncate">{task.project.name}</span>
      </span>
      <Link
        href={`/projects/${task.projectId}/tasks`}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
      >
        {task.title}
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={cn(
            'hidden rounded-md border px-2 py-0.5 text-xs font-semibold sm:inline',
            statusBadgeClass[task.status],
          )}
        >
          {status.label}
        </span>
        <span
          className={cn('flex items-center gap-1 text-xs', priority.className)}
          title={`우선순위 ${priority.label}`}
        >
          <PriorityIcon className="size-4" />
          <span className="hidden md:inline">{priority.label}</span>
        </span>
        <DdayBadge dueDate={task.dueDate} nowMs={nowMs} />
      </div>
    </div>
  )
}
