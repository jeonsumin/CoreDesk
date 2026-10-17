'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/admin'
import { parseMemoFormData } from '@/lib/memo/validation'
import { prisma } from '@/lib/prisma'

type ActionResult = { error?: string }

// 프로젝트 상세와 같은 기준: 멤버 또는 ADMIN만 프로젝트 메모에 접근
async function ensureProjectAccess(projectId: string): Promise<string> {
  const user = await getCurrentDbUser()
  if (!user) throw new Error('Unauthorized')
  if (user.role === 'ADMIN') return user.id

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { userId: true },
  })
  if (!member) throw new Error('Forbidden')
  return user.id
}

// 수정·삭제는 작성자 본인만
async function findOwnProjectMemo(projectId: string, memoId: string, ownerId: string) {
  return prisma.memo.findFirst({
    where: { id: memoId, projectId, ownerId },
    select: { id: true },
  })
}

export async function createProjectMemo(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ownerId = await ensureProjectAccess(projectId)
  const parsed = parseMemoFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  const memo = await prisma.memo.create({
    data: { ...parsed.data, ownerId, projectId },
  })

  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}/memos/${memo.id}`)
}

export async function updateProjectMemo(
  projectId: string,
  memoId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ownerId = await ensureProjectAccess(projectId)
  if (!(await findOwnProjectMemo(projectId, memoId, ownerId))) {
    return { error: '메모를 찾을 수 없습니다' }
  }

  const parsed = parseMemoFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  await prisma.memo.update({ where: { id: memoId }, data: parsed.data })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/memos/${memoId}`)
  redirect(`/projects/${projectId}/memos/${memoId}`)
}

export async function deleteProjectMemoFormAction(
  projectId: string,
  memoId: string,
): Promise<void> {
  const ownerId = await ensureProjectAccess(projectId)
  if (!(await findOwnProjectMemo(projectId, memoId, ownerId))) {
    throw new Error('메모를 찾을 수 없습니다')
  }

  await prisma.memo.delete({ where: { id: memoId } })

  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}?tab=memos`)
}
