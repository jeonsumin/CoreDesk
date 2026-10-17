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
import { ListTodo, Plus } from 'lucide-react'
import { CountBadge, EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
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

  const newTaskDialog = (trigger: React.ReactElement) => (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 태스크</DialogTitle>
        </DialogHeader>
        <TaskForm projectId={id} members={members} />
      </DialogContent>
    </Dialog>
  )

  return (
    <Panel className="flex-1">
      <PanelHeader
        icon={<ListTodo />}
        title={`${project.name} 태스크`}
        count={project.tasks.length}
        actions={newTaskDialog(
          <Button size="icon" aria-label="태스크 추가" title="태스크 추가">
            <Plus />
          </Button>,
        )}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {project.tasks.length === 0 ? (
          <EmptyState
            icon={<ListTodo />}
            title="아직 태스크가 없습니다."
            description="첫 태스크를 추가해 진행 상황을 관리하세요."
            action={newTaskDialog(
              <Button>
                <Plus data-icon="inline-start" />첫 태스크 추가하기
              </Button>,
            )}
          />
        ) : (
          <div className="space-y-6">
            {statusOrder.map((s) => {
              const tasks = grouped[s]
              if (tasks.length === 0) return null
              return (
                <section key={s}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    {statusLabel[s]}
                    <CountBadge>{tasks.length}</CountBadge>
                  </h3>
                  <div className="border-t">
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        projectId={id}
                        members={members}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </Panel>
  )
}
