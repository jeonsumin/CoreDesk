import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { ProjectSummaryCard } from './_components/ProjectSummaryCard'
import { RiskBanner } from './_components/RiskBanner'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { TodayTaskList } from './_components/TodayTaskList'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Plus,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const now = new Date()
  const nowMs = now.getTime()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
      status: { not: 'CANCELLED' },
    },
    include: { tasks: true },
    orderBy: { updatedAt: 'desc' },
  })

  const riskProjects = projects.filter((p) => {
    if (!p.endDate) return false
    const daysLeft = Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / 86400000)
    const total = p.tasks.length
    const done = p.tasks.filter((t) => t.status === 'DONE').length
    const progress = total > 0 ? (done / total) * 100 : 0
    return daysLeft <= 7 && progress < 50
  })

  const todayTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { not: 'DONE' },
      dueDate: { lte: todayEnd },
    },
    include: { project: true },
    orderBy: { priority: 'asc' },
  })

  const weekTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { not: 'DONE' },
      dueDate: { gt: todayEnd, lte: weekEnd },
    },
    include: { project: true },
    orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
  })

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const doneTasks = projects.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.status === 'DONE').length,
    0,
  )
  const taskProgress =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length
  const overdueTasks = todayTasks.filter(
    (task) => task.dueDate && task.dueDate.getTime() < nowMs,
  ).length
  const criticalTaskCount = todayTasks.length + weekTasks.length

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader
        title="대시보드"
        actions={
          <>
            <Link href="/my-tasks" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <ClipboardList data-icon="inline-start" />
              내 태스크
            </Link>
            <Link href="/projects/new" className={buttonVariants({ size: 'lg' })}>
              <FolderKanban data-icon="inline-start" />
              프로젝트 만들기
            </Link>
          </>
        }
      />

      <RiskBanner riskProjects={riskProjects} nowMs={nowMs} />

      <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<FolderKanban className="size-4" />}
          tone="primary"
          label="참여 프로젝트"
          value={projects.length}
          meta={`진행 중 ${inProgressProjects}개`}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
          label="태스크 완료율"
          value={`${taskProgress}%`}
          meta={`${doneTasks}/${totalTasks} 완료`}
        />
        <StatCard
          icon={<Timer className="size-4" />}
          label="처리 필요"
          value={criticalTaskCount}
          meta={`오늘 ${todayTasks.length}개 · 이번 주 ${weekTasks.length}개`}
          tone={criticalTaskCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label="리스크"
          value={riskProjects.length}
          meta={`초과 태스크 ${overdueTasks}개`}
          tone={riskProjects.length > 0 || overdueTasks > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            icon={<FolderKanban />}
            title="프로젝트 진행판"
            count={projects.length}
            actions={
              <>
                <span className="hidden text-xs text-muted-foreground md:inline">
                  최근 업데이트 순 · 취소 프로젝트 제외
                </span>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  전체 보기
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            }
          />

          {projects.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<FolderKanban />}
                title="참여 중인 프로젝트가 없습니다"
                description="새 프로젝트를 만들어 팀과 진행 상황을 공유하세요."
                action={
                  <Link href="/projects/new" className={buttonVariants()}>
                    <Plus data-icon="inline-start" />
                    프로젝트 만들기
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[minmax(220px,1.3fr)_120px_160px_110px] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>프로젝트</span>
                  <span>상태</span>
                  <span>진행률</span>
                  <span>마감</span>
                </div>
                {projects.map((project) => (
                  <ProjectSummaryCard
                    key={project.id}
                    project={project}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            icon={<ClipboardList />}
            title="내 작업 큐"
            count={criticalTaskCount}
            actions={
              <Link
                href="/my-tasks"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                이동
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {todayTasks.length === 0 && weekTasks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<CalendarCheck />}
                title="마감 예정 태스크가 없습니다"
                description="이번 주까지 처리할 미완료 태스크가 없어요."
                action={
                  <Link href="/my-tasks" className={cn(buttonVariants({ variant: 'outline' }))}>
                    <ClipboardList data-icon="inline-start" />
                    내 태스크 보기
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <TodayTaskList
                tasks={todayTasks}
                title="오늘 마감"
                nowMs={nowMs}
              />
              <TodayTaskList
                tasks={weekTasks}
                title="이번 주 마감"
                nowMs={nowMs}
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
