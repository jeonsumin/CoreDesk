import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteProjectFormAction } from '../_actions/project'
import { ProjectTabBar } from '../_components/ProjectTabBar'
import { KanbanBoard } from './tasks/_components/KanbanBoard'
import { WbsTimeline } from './milestones/_components/WbsTimeline'
import { MemberList } from '../_components/MemberList'
import { InfoPanel } from './info/_components/InfoPanel'
import { ProjectMemoList } from '../_components/ProjectMemoList'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; subtab?: string }>
}

const statusLabel: Record<string, string> = {
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  ON_HOLD: '보류',
  CANCELLED: '취소',
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab, subtab } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: true,
      members: { include: { user: true } },
      tasks: {
        include: { assignee: true },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
      milestones: { orderBy: { dueDate: 'asc' } },
      memos: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!project) notFound()

  const sessionUser = session.user
  const currentMember = project.members.find((m) => m.userId === sessionUser.id)
  const isAdmin = sessionUser.role === 'ADMIN'
  if (!currentMember && !isAdmin) notFound()

  const isOwner = project.ownerId === sessionUser.id
  const isPM = currentMember?.role === 'PM'
  const canManage = isAdmin || isOwner || isPM
  const canUpdateTasks =
    isAdmin ||
    isOwner ||
    currentMember?.role === 'PM' ||
    currentMember?.role === 'DEVELOPER'

  const total = project.tasks.length
  const done = project.tasks.filter((t) => t.status === 'DONE').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const completedMilestones = project.milestones.filter((m) => m.isCompleted).length

  const tabs = [
    { key: 'info', label: '정보' },
    { key: 'tasks', label: '태스크 관리' },
    { key: 'milestones', label: '마일스톤' },
    { key: 'memos', label: '메모' },
    ...(canManage ? [{ key: 'members', label: '멤버 관리' }] : []),
  ]

  const activeTab = tab && tabs.some((t) => t.key === tab) ? tab : 'tasks'
  const members = project.members.map((m) => m.user)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge>{statusLabel[project.status]}</Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href={`/projects/${id}/settings`}
              className={buttonVariants({ variant: 'outline' })}
            >
              설정
            </Link>
            <form action={deleteProjectFormAction.bind(null, id)}>
              <Button variant="destructive" type="submit" size="sm">
                삭제
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">진행률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {done}/{total} 태스크 완료
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">멤버</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.members.length}</div>
            <p className="text-xs text-muted-foreground">명 참여 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">마일스톤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedMilestones}/{project.milestones.length}
            </div>
            <p className="text-xs text-muted-foreground">완료</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab bar */}
      <ProjectTabBar projectId={id} activeTab={activeTab} tabs={tabs} />

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'tasks' && (
          <KanbanBoard
            initialTasks={project.tasks}
            projectId={id}
            members={members}
            canManageTasks={canManage}
            canUpdateTasks={canUpdateTasks}
          />
        )}
        {activeTab === 'milestones' && (
          <WbsTimeline
            initialMilestones={project.milestones}
            projectId={id}
            canManage={canManage}
          />
        )}
        {activeTab === 'info' && (
          <InfoPanel
            projectId={id}
            subtab={subtab ?? 'url'}
            canManage={canManage}
          />
        )}
        {activeTab === 'memos' && (
          <ProjectMemoList projectId={id} memos={project.memos} />
        )}
        {activeTab === 'members' && canManage && (
          <div className="max-w-2xl">
            <MemberList
              projectId={id}
              members={project.members}
              currentUserId={session.user.id}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>
    </div>
  )
}
