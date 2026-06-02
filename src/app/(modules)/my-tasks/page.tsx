import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { TaskStatus, Priority } from '@/types'

const statusLabel: Record<TaskStatus, string> = {
  TODO: '할 일',
  IN_PROGRESS: '진행 중',
  REVIEW: '검토',
  DONE: '완료',
}

const statusVariant: Record<
  TaskStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  TODO: 'outline',
  IN_PROGRESS: 'default',
  REVIEW: 'secondary',
  DONE: 'secondary',
}

const priorityVariant: Record<
  Priority,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
}

const priorityLabel: Record<Priority, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}

function DdayBadge({ dueDate, nowMs }: { dueDate: Date | null; nowMs: number }) {
  if (!dueDate) return null
  const diff = Math.ceil(
    (new Date(dueDate).getTime() - nowMs) / 86400000,
  )
  if (diff < 0)
    return (
      <Badge variant="destructive" className="text-xs">
        D+{Math.abs(diff)} 초과
      </Badge>
    )
  if (diff <= 3)
    return (
      <Badge className="text-xs bg-orange-500 text-white hover:bg-orange-500">
        D-{diff}
      </Badge>
    )
  return <span className="text-xs text-muted-foreground">D-{diff}</span>
}

export default async function MyTasksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const nowMs = new Date().getTime()

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: session.user.id,
      status: { not: 'DONE' },
    },
    include: { project: true },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">내 태스크</h1>
        <p className="text-muted-foreground">미완료 태스크 {tasks.length}개</p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">완료되지 않은 태스크가 없습니다.</p>
          <p className="text-sm text-muted-foreground mt-1">잘 하고 있어요!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/projects/${task.projectId}/tasks`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {task.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {task.project.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DdayBadge dueDate={task.dueDate} nowMs={nowMs} />
                  <Badge
                    variant={priorityVariant[task.priority]}
                    className="text-xs"
                  >
                    {priorityLabel[task.priority]}
                  </Badge>
                  <Badge
                    variant={statusVariant[task.status]}
                    className="text-xs"
                  >
                    {statusLabel[task.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
