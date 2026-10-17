import { notFound, redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

// 프로젝트 메모 페이지 공통: 멤버 또는 ADMIN이 아니면 404 (프로젝트 상세와 동일 기준)
export async function getProjectMemoContext(projectId: string) {
  const user = await getCurrentDbUser()
  if (!user) redirect('/api/logout')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      members: { where: { userId: user.id }, select: { userId: true } },
    },
  })
  if (!project) notFound()
  if (project.members.length === 0 && user.role !== 'ADMIN') notFound()

  return { userId: user.id, project: { id: project.id, name: project.name } }
}
