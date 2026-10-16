'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { canManageProject, isProjectMemberRole, type ProjectMemberRole } from '@/lib/project-access'

type ActionResult = { ok: true } | { error: string }

async function assertCanManage(
  projectId: string,
): Promise<{ error: string } | { ownerId: string; requesterId: string }> {
  const user = await getCurrentDbUser()
  if (!user) return { error: '권한이 없습니다' }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })
  if (!project) return { error: '프로젝트를 찾을 수 없습니다' }

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { role: true },
  })

  const allowed = canManageProject({
    userRole: user.role,
    isOwner: project.ownerId === user.id,
    memberRole: member?.role ?? null,
  })
  if (!allowed) return { error: '권한이 없습니다' }

  return { ownerId: project.ownerId, requesterId: user.id }
}

async function isMember(projectId: string, userId: string): Promise<boolean> {
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { userId: true },
  })
  return m !== null
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)
}

export async function inviteMember(
  projectId: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<ActionResult> {
  if (!isProjectMemberRole(role)) return { error: '올바르지 않은 역할입니다' }
  const access = await assertCanManage(projectId)
  if ('error' in access) return access

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target || !target.isActive) return { error: '초대할 수 없는 사용자입니다' }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  if (existing) return { error: '이미 프로젝트 멤버입니다' }

  await prisma.projectMember.create({ data: { projectId, userId, role } })

  revalidate(projectId)
  return { ok: true }
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<ActionResult> {
  if (!isProjectMemberRole(role)) return { error: '올바르지 않은 역할입니다' }
  const access = await assertCanManage(projectId)
  if ('error' in access) return access

  if (userId === access.ownerId)
    return { error: '프로젝트 오너의 역할은 변경할 수 없습니다' }
  if (!(await isMember(projectId, userId))) return { error: '프로젝트 멤버가 아닙니다' }

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  })

  revalidate(projectId)
  return { ok: true }
}

export async function removeMember(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  const access = await assertCanManage(projectId)
  if ('error' in access) return access

  if (userId === access.ownerId)
    return { error: '프로젝트 오너는 제거할 수 없습니다' }
  if (userId === access.requesterId)
    return { error: '자기 자신은 제거할 수 없습니다' }
  if (!(await isMember(projectId, userId))) return { error: '프로젝트 멤버가 아닙니다' }

  // 해당 멤버에게 배정된 태스크를 미배정 처리
  await prisma.task.updateMany({
    where: { projectId, assigneeId: userId },
    data: { assigneeId: null },
  })

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  })

  revalidate(projectId)
  return { ok: true }
}
