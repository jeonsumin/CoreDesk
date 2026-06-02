import Link from 'next/link'
import { Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Task, Project } from '@/types'

type TaskWithProject = Task & { project: Project }

type Props = {
  tasks: TaskWithProject[]
  title: string
  nowMs: number
}

const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
}

const priorityLabel: Record<string, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}

export function TodayTaskList({ tasks, title, nowMs }: Props) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Clock3 className="size-3.5 text-muted-foreground" />
        {title} ({tasks.length})
      </h3>
      <div className="space-y-1.5">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/projects/${task.projectId}/tasks`}
            className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {task.project.name}
                </p>
              </div>
              <Badge
                variant={priorityVariant[task.priority]}
                className="shrink-0 text-xs"
              >
                {priorityLabel[task.priority]}
              </Badge>
            </div>
            {task.dueDate && (
              <p
                className={cn(
                  'mt-2 text-xs text-muted-foreground',
                  task.dueDate.getTime() < nowMs &&
                    'font-medium text-destructive',
                )}
              >
                {task.dueDate.toLocaleDateString('ko-KR')}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
