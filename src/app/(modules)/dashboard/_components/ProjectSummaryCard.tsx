import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types'

type Props = {
  project: Project & { tasks: Task[] }
  nowMs: number
}

const statusLabel: Record<string, string> = {
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  ON_HOLD: '보류',
  CANCELLED: '취소',
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  ON_HOLD: 'outline',
  CANCELLED: 'destructive',
}

export function ProjectSummaryCard({ project, nowMs }: Props) {
  const total = project.tasks.length
  const done = project.tasks.filter((t) => t.status === 'DONE').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const daysLeft = project.endDate
    ? Math.ceil((new Date(project.endDate).getTime() - nowMs) / 86400000)
    : null

  const isRisk = daysLeft !== null && daysLeft <= 7 && progress < 50
  const progressTone = isRisk
    ? 'bg-orange-500'
    : progress === 100
      ? 'bg-emerald-500'
      : 'bg-primary'

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'grid grid-cols-[minmax(220px,1.3fr)_120px_160px_110px] gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/40',
        isRisk && 'bg-orange-50/60 hover:bg-orange-50',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {project.description || `${done}/${total} 태스크 완료`}
        </p>
      </div>

      <div className="flex items-center">
        <Badge variant={statusVariant[project.status]} className="text-xs">
          {statusLabel[project.status]}
        </Badge>
      </div>

      <div className="flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {done}/{total}
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full transition-all', progressTone)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        className={cn(
          'flex items-center text-xs text-muted-foreground',
          daysLeft !== null &&
            daysLeft < 0 &&
            'font-medium text-destructive',
          daysLeft !== null &&
            daysLeft >= 0 &&
            daysLeft <= 7 &&
            'font-medium text-orange-600',
        )}
      >
        {daysLeft === null
          ? '미지정'
          : daysLeft < 0
            ? `D+${Math.abs(daysLeft)} 초과`
            : `D-${daysLeft}`}
      </div>
    </Link>
  )
}
