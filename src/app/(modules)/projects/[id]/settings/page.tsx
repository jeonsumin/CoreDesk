import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { canManageProject } from '@/lib/project-access'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberList } from '../../_components/MemberList'
import { ProjectForm } from '../../_components/ProjectForm'

type Props = { params: Promise<{ id: string }> }

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  })

  if (!project) notFound()

  const currentMember = project.members.find(
    (m) => m.userId === session.user.id,
  )
  const dbUser = await getCurrentDbUser()
  if (!dbUser) redirect('/login')
  const isAdmin = dbUser.role === 'ADMIN'
  if (!currentMember && !isAdmin) notFound()

  const canManage = canManageProject({
    userRole: dbUser.role,
    isOwner: project.ownerId === session.user.id,
    memberRole: currentMember?.role,
  })
  const candidates = canManage
    ? await prisma.user.findMany({
        where: { isActive: true, projectMembers: { none: { projectId: id } } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">프로젝트 설정</h1>
        <p className="text-muted-foreground">{project.name}</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>기본 정보 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm project={project} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>멤버 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList
            projectId={id}
            ownerId={project.ownerId}
            members={project.members}
            candidates={candidates}
            currentUserId={session.user.id}
            canManage={canManage}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  )
}
