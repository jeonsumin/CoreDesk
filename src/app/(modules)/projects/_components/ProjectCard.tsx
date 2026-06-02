import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Project, Task } from '@/types'

type ProjectCardProps = {
  project: Project & { tasks: Task[]; _count?: { members: number } }
}

const statusLabel: Record<string, string> = {
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  ON_HOLD: '보류',
  CANCELLED: '취소',
}

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  ON_HOLD: 'outline',
  CANCELLED: 'destructive',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const total = project.tasks.length
  const done = project.tasks.filter((t) => t.status === 'DONE').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const now = new Date()
  const daysLeft = project.endDate
    ? Math.ceil(
        (project.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    : null

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">
              {project.name}
            </CardTitle>
            <Badge variant={statusVariant[project.status]} className="shrink-0">
              {statusLabel[project.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>진행률</span>
              <span>
                {done}/{total} 태스크 ({progress}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {daysLeft !== null && (
            <p
              className={`text-xs ${
                daysLeft < 0
                  ? 'text-destructive'
                  : daysLeft <= 7
                    ? 'text-orange-500'
                    : 'text-muted-foreground'
              }`}
            >
              {daysLeft < 0 ? `D+${Math.abs(daysLeft)} 초과` : `D-${daysLeft}`}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
