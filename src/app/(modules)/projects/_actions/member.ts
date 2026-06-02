'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function inviteMember(projectId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const email = formData.get('email') as string
  const role = (formData.get('role') as string) || 'DEVELOPER'

  if (!email) return { error: '이메일을 입력해주세요' }

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: session.user.id, role: 'PM' },
  })
  if (!member) return { error: '멤버 초대 권한이 없습니다' }

  const targetUser = await prisma.user.findUnique({ where: { email } })
  if (!targetUser) return { error: '해당 이메일로 가입된 사용자가 없습니다' }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUser.id } },
  })
  if (existing) return { error: '이미 프로젝트 멤버입니다' }

  await prisma.projectMember.create({
    data: {
      projectId,
      userId: targetUser.id,
      role: role as 'PM' | 'DEVELOPER' | 'VIEWER',
    },
  })

  revalidatePath(`/projects/${projectId}/settings`)
  return { ok: true }
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: 'PM' | 'DEVELOPER' | 'VIEWER',
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const requester = await prisma.projectMember.findFirst({
    where: { projectId, userId: session.user.id, role: 'PM' },
  })
  if (!requester) return { error: '권한이 없습니다' }

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  })

  revalidatePath(`/projects/${projectId}/settings`)
  return { ok: true }
}

export async function removeMember(projectId: string, userId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { error: '프로젝트를 찾을 수 없습니다' }

  const requester = await prisma.projectMember.findFirst({
    where: { projectId, userId: session.user.id, role: 'PM' },
  })
  if (!requester) return { error: '권한이 없습니다' }

  if (userId === project.ownerId)
    return { error: '프로젝트 오너는 제거할 수 없습니다' }

  // 해당 멤버에게 배정된 태스크를 미배정 처리
  await prisma.task.updateMany({
    where: { projectId, assigneeId: userId },
    data: { assigneeId: null },
  })

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  })

  revalidatePath(`/projects/${projectId}/settings`)
  return { ok: true }
}
