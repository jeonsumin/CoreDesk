import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TaskRow } from './_components/TaskRow'
import { TaskForm } from './_components/TaskForm'
import type { TaskStatus } from '@/types'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}

const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
const statusLabel: Record<TaskStatus, string> = {
  TODO: '할 일',
  IN_PROGRESS: '진행 중',
  REVIEW: '검토',
  DONE: '완료',
}

export default async function TasksPage({ params, searchParams }: Props) {
  const { id } = await params
  const { status } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
      },
      tasks: {
        include: { assignee: { select: { id: true, name: true, email: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  })

  if (!project) notFound()

  const isMember = project.members.some((m) => m.userId === session.user.id)
  if (!isMember) notFound()

  const members = project.members
    .map((m) => m.user)
    .filter((u) => u.isActive)
  const validStatus = statusOrder.includes(status as TaskStatus)
    ? (status as TaskStatus)
    : null
  const filteredTasks = validStatus
    ? project.tasks.filter((t) => t.status === validStatus)
    : project.tasks

  const grouped = statusOrder.reduce(
    (acc, s) => {
      acc[s] = filteredTasks.filter((t) => t.status === s)
      return acc
    },
    {} as Record<TaskStatus, typeof filteredTasks>,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">태스크</h1>
          <p className="text-muted-foreground">
            {project.name} · {project.tasks.length}개
          </p>
        </div>
        <Dialog>
          <DialogTrigger render={<Button>태스크 추가</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 태스크</DialogTitle>
            </DialogHeader>
            <TaskForm projectId={id} members={members} />
          </DialogContent>
        </Dialog>
      </div>

      {project.tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">아직 태스크가 없습니다.</p>
          <Dialog>
            <DialogTrigger render={<Button>첫 태스크 추가하기</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 태스크</DialogTitle>
              </DialogHeader>
              <TaskForm projectId={id} members={members} />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-6">
          {statusOrder.map((s) => {
            const tasks = grouped[s]
            if (tasks.length === 0) return null
            return (
              <div key={s}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  {statusLabel[s]} ({tasks.length})
                </h2>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      projectId={id}
                      members={members}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
