import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FolderKanban, Timer } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { StatCard } from '@/components/layout/StatCard'
import { ProjectCard } from './_components/ProjectCard'
import type { ProjectStatus } from '@/types'

type Props = {
  searchParams: Promise<{ status?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { status } = await searchParams

  const validStatuses: ProjectStatus[] = [
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED',
  ]
  const statusFilter = validStatuses.includes(status as ProjectStatus)
    ? (status as ProjectStatus)
    : undefined

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
      ...(statusFilter && { status: statusFilter }),
    },
    include: {
      tasks: { where: { type: { not: 'EPIC' } } },
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const doneTasks = projects.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.status === 'DONE').length,
    0,
  )
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const now = new Date().getTime()
  const riskCount = projects.filter((p) => {
    if (!p.endDate || p.status !== 'IN_PROGRESS') return false
    const daysLeft = Math.ceil((p.endDate.getTime() - now) / 86400000)
    const total = p.tasks.length
    const done = p.tasks.filter((t) => t.status === 'DONE').length
    return daysLeft <= 7 && (total > 0 ? (done / total) * 100 : 0) < 50
  }).length

  return (
    <Panel className="flex-1">
      <PanelHeader
        icon={<FolderKanban />}
        title="프로젝트별 현황"
        count={projects.length}
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={<FolderKanban />} label="프로젝트" value={`${projects.length}개`} />
          <StatCard
            icon={<Timer />}
            label="진행 중"
            value={projects.filter((p) => p.status === 'IN_PROGRESS').length}
            tone="info"
          />
          <StatCard
            icon={<CheckCircle2 />}
            label="태스크 완료율"
            value={`${progress}%`}
            meta={`${doneTasks}/${totalTasks} 완료`}
            tone="success"
          />
          <StatCard
            icon={<AlertTriangle />}
            label="마감 리스크"
            value={riskCount}
            tone={riskCount > 0 ? 'danger' : 'default'}
          />
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban />}
            title={
              statusFilter
                ? '해당 상태의 프로젝트가 없습니다.'
                : '아직 참여한 프로젝트가 없습니다.'
            }
            description="프로젝트를 만들고 팀원을 초대해 태스크를 관리하세요."
            action={
              <Link href="/projects/new" className={buttonVariants()}>
                첫 프로젝트 만들기
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
