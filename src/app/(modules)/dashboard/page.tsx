import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProjectSummaryCard } from './_components/ProjectSummaryCard'
import { RiskBanner } from './_components/RiskBanner'
import { TodayTaskList } from './_components/TodayTaskList'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Timer,
} from 'lucide-react'

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
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {session?.user?.name}님의 워크스페이스
          </p>
          <h1 className="text-2xl font-bold">프로젝트 운영 현황</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/my-tasks"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ClipboardList data-icon="inline-start" />
            내 태스크
          </Link>
          <Link
            href="/projects/new"
            className={buttonVariants({ size: 'sm' })}
          >
            <FolderKanban data-icon="inline-start" />
            프로젝트 생성
          </Link>
        </div>
      </div>

      <RiskBanner riskProjects={riskProjects} nowMs={nowMs} />

      <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          icon={<FolderKanban className="size-4" />}
          label="참여 프로젝트"
          value={projects.length}
          meta={`진행 중 ${inProgressProjects}개`}
        />
        <DashboardMetricCard
          icon={<CheckCircle2 className="size-4" />}
          label="태스크 완료율"
          value={`${taskProgress}%`}
          meta={`${doneTasks}/${totalTasks} 완료`}
        />
        <DashboardMetricCard
          icon={<Timer className="size-4" />}
          label="처리 필요"
          value={criticalTaskCount}
          meta={`오늘 ${todayTasks.length}개 · 이번 주 ${weekTasks.length}개`}
          tone={criticalTaskCount > 0 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          icon={<AlertTriangle className="size-4" />}
          label="리스크"
          value={riskProjects.length}
          meta={`초과 태스크 ${overdueTasks}개`}
          tone={riskProjects.length > 0 || overdueTasks > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-0 overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">프로젝트 진행판</h2>
              <p className="text-xs text-muted-foreground">
                최근 업데이트 순 · 취소 프로젝트 제외
              </p>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              전체 보기
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="flex h-72 items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <FolderKanban className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="font-medium">참여 중인 프로젝트가 없습니다.</p>
                <Link
                  href="/projects/new"
                  className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}
                >
                  프로젝트 생성
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-auto">
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
        </section>

        <aside className="min-h-0 overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">내 작업 큐</h2>
              <p className="text-xs text-muted-foreground">
                미완료 마감 태스크
              </p>
            </div>
            <Link
              href="/my-tasks"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              이동
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="max-h-full overflow-auto p-4">
            {todayTasks.length === 0 && weekTasks.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                마감 예정 태스크가 없습니다.
              </div>
            ) : (
              <div className="space-y-5">
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
          </div>
        </aside>
      </div>
    </div>
  )
}

type DashboardMetricCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  meta: string
  tone?: 'default' | 'warning' | 'danger'
}

function DashboardMetricCard({
  icon,
  label,
  value,
  meta,
  tone = 'default',
}: DashboardMetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-background p-4',
        tone === 'warning' && 'border-orange-200 bg-orange-50/60',
        tone === 'danger' && 'border-red-200 bg-red-50/60',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground',
            tone === 'warning' && 'bg-orange-100 text-orange-700',
            tone === 'danger' && 'bg-red-100 text-red-700',
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          'mt-3 text-2xl font-bold',
          tone === 'warning' && 'text-orange-700',
          tone === 'danger' && 'text-red-700',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </div>
  )
}
