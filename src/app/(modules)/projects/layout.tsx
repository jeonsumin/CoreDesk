import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FolderPlus } from 'lucide-react'
import { getCurrentDbUser } from '@/lib/admin'
import { canManageProject } from '@/lib/project-access'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectStatusTabs } from './_components/ProjectStatusTabs'
import { ProjectListPanel } from './_components/ProjectListPanel'

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentDbUser()
  if (!user) redirect('/api/logout')
  const userId = user.id

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      status: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const items = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    memberCount: p.members.length,
    canManage: canManageProject({
      userRole: user.role,
      isOwner: p.ownerId === userId,
      memberRole: p.members.find((m) => m.userId === userId)?.role,
    }),
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader
        title="프로젝트 관리"
        tabs={<ProjectStatusTabs />}
        actions={
          <Link
            href="/projects/new"
            aria-label="새 프로젝트"
            title="새 프로젝트"
            className={buttonVariants({ size: 'icon-lg' })}
          >
            <FolderPlus />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 gap-4">
        <ProjectListPanel projects={items} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
