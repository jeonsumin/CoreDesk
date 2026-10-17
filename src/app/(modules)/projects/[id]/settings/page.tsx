import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { canManageProject } from '@/lib/project-access'
import { Settings } from 'lucide-react'
import { FormPanel, FormSection } from '@/components/layout/FormPanel'
import { MemberList } from '../../_components/MemberList'
import { ProjectForm } from '../../_components/ProjectForm'

type Props = { params: Promise<{ id: string }> }

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params
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
    },
  })

  if (!project) notFound()

  const currentMember = project.members.find(
    (m) => m.userId === session.user.id,
  )
  const dbUser = await getCurrentDbUser()
  if (!dbUser) redirect('/api/logout')
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
    <FormPanel icon={<Settings />} title={`${project.name} 설정`}>
      {canManage && (
        <FormSection title="기본 정보" description="프로젝트 이름, 상태, 기간을 수정합니다.">
          <ProjectForm project={project} />
        </FormSection>
      )}

      <FormSection title="멤버 관리" description="프로젝트에 참여할 팀원과 역할을 관리합니다.">
        <MemberList
          projectId={id}
          ownerId={project.ownerId}
          members={project.members}
          candidates={candidates}
          currentUserId={session.user.id}
          canManage={canManage}
          isAdmin={isAdmin}
        />
      </FormSection>
    </FormPanel>
  )
}
