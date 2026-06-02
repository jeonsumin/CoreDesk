import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { ProjectCard } from './_components/ProjectCard'
import { ProjectFilters } from './_components/ProjectFilters'
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
      tasks: true,
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">프로젝트</h1>
          <p className="text-muted-foreground">
            참여 중인 프로젝트 {projects.length}개
          </p>
        </div>
        <Link href="/projects/new" className={buttonVariants()}>
          새 프로젝트
        </Link>
      </div>

      <ProjectFilters />

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {statusFilter
              ? '해당 상태의 프로젝트가 없습니다.'
              : '아직 참여한 프로젝트가 없습니다.'}
          </p>
          <Link href="/projects/new" className={buttonVariants()}>
            첫 프로젝트 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
