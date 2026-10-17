import Link from 'next/link'
import { ProgressBar } from '@/components/layout/StatCard'
import { projectColor, projectStatusLabel } from '@/lib/projects/appearance'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'

type Props = {
  project: Project & { tasks: Task[] }
  nowMs: number
}

const statusBadgeClass: Record<string, string> = {
  IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-700',
  COMPLETED: 'border-green-200 bg-green-50 text-green-700',
  ON_HOLD: 'border-border bg-muted text-muted-foreground',
  CANCELLED: 'border-red-200 bg-red-50 text-red-600',
}

export function ProjectSummaryCard({ project, nowMs }: Props) {
  const total = project.tasks.length
  const done = project.tasks.filter((t) => t.status === 'DONE').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const daysLeft = project.endDate
    ? Math.ceil((new Date(project.endDate).getTime() - nowMs) / 86400000)
    : null

  return (
    <Link
      href={`/projects/${project.id}`}
      className="grid grid-cols-[minmax(220px,1.3fr)_120px_160px_110px] items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
            projectColor(project.id),
          )}
          aria-hidden
        >
          {project.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{project.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.description || `${done}/${total} 태스크 완료`}
          </p>
        </div>
      </div>

      <div>
        <span
          className={cn(
            'rounded-md border px-2 py-0.5 text-xs font-semibold',
            statusBadgeClass[project.status],
          )}
        >
          {projectStatusLabel[project.status]}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className="text-muted-foreground">
            {done}/{total}
          </span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <ProgressBar value={progress} className="h-1.5" />
      </div>

      <div className="text-xs">
        {daysLeft === null ? (
          <span className="text-muted-foreground">미지정</span>
        ) : daysLeft < 0 ? (
          <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-600">
            D+{Math.abs(daysLeft)} 초과
          </span>
        ) : daysLeft <= 7 ? (
          <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 font-semibold text-orange-600">
            D-{daysLeft}
          </span>
        ) : (
          <span className="text-muted-foreground tabular-nums">D-{daysLeft}</span>
        )}
      </div>
    </Link>
  )
}
