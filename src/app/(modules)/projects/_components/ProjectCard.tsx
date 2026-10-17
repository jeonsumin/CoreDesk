import Link from 'next/link'
import { Calendar, Users } from 'lucide-react'
import { ProgressBar } from '@/components/layout/StatCard'
import { projectColor, projectStatusLabel } from '@/lib/projects/appearance'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'

type ProjectCardProps = {
  project: Project & { tasks: Task[]; _count?: { members: number } }
}

function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : '미정'
}

export function ProjectCard({ project }: ProjectCardProps) {
  const total = project.tasks.length
  const done = project.tasks.filter((t) => t.status === 'DONE').length
  const inProgress = project.tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const daysLeft = project.endDate
    ? Math.ceil((project.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
            projectColor(project.id),
          )}
        >
          {project.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{project.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {project.description || projectStatusLabel[project.status]}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold',
            project.status === 'IN_PROGRESS' && 'border-primary/30 text-primary',
            project.status === 'COMPLETED' && 'border-green-300 text-green-600',
            project.status === 'ON_HOLD' && 'border-orange-300 text-orange-500',
            project.status === 'CANCELLED' && 'border-red-300 text-red-500',
          )}
        >
          {projectStatusLabel[project.status]}
        </span>
      </div>

      <p className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
        </span>
        {project._count && (
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {project._count.members}
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">진행 중 태스크</p>
          <p className="font-bold text-blue-600">{inProgress}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">마감</p>
          <p
            className={cn(
              'font-bold',
              daysLeft === null && 'text-muted-foreground',
              daysLeft !== null && daysLeft < 0 && 'text-red-500',
              daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && 'text-orange-500',
            )}
          >
            {daysLeft === null
              ? '-'
              : daysLeft < 0
                ? `D+${Math.abs(daysLeft)} 초과`
                : `D-${daysLeft}`}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">진행률</span>
          <span className="font-semibold text-primary">
            {done}/{total} ({progress}%)
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>
    </Link>
  )
}
