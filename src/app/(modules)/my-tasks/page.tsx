import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleCheck, FolderKanban, ListTodo } from 'lucide-react'
import { MyTaskRow } from './_components/MyTaskRow'

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
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader title="내 태스크" />

      <Panel className="flex-1">
        <PanelHeader icon={<ListTodo />} title="미완료 태스크" count={tasks.length} />
        {tasks.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<CircleCheck />}
              title="완료되지 않은 태스크가 없습니다"
              description="잘 하고 있어요! 프로젝트에서 다음 작업을 확인해 보세요."
              action={
                <Link href="/projects" className={buttonVariants()}>
                  <FolderKanban data-icon="inline-start" />
                  프로젝트 보기
                </Link>
              }
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            {tasks.map((task) => (
              <MyTaskRow key={task.id} task={task} nowMs={nowMs} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
