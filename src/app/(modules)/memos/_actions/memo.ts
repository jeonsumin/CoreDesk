'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { parseMemoFormData } from '@/lib/memo/validation'
import { prisma } from '@/lib/prisma'
import { requireMenuWrite } from '@/lib/menu/access'

type ActionResult = { error?: string }

async function ensureAuthenticated(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

async function canUseProject(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId } },
    },
    select: { id: true },
  })

  return Boolean(project)
}

async function validateProjectLink(
  projectId: string | undefined,
  userId: string,
): Promise<ActionResult> {
  if (!projectId) return {}
  const isMember = await canUseProject(projectId, userId)
  return isMember ? {} : { error: '프로젝트를 찾을 수 없습니다' }
}

export async function createMemo(formData: FormData): Promise<ActionResult> {
  await requireMenuWrite('/memos')
  const ownerId = await ensureAuthenticated()
  const parsed = parseMemoFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  const projectValidation = await validateProjectLink(
    parsed.data.projectId,
    ownerId,
  )
  if (projectValidation.error) return projectValidation

  const memo = await prisma.memo.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      ownerId,
      projectId: parsed.data.projectId,
    },
  })

  revalidatePath('/memos')
  if (memo.projectId) revalidatePath(`/projects/${memo.projectId}`)
  redirect(`/memos/${memo.id}`)
}

export async function updateMemo(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireMenuWrite('/memos')
  const ownerId = await ensureAuthenticated()
  const memo = await prisma.memo.findUnique({
    where: { id },
    select: { ownerId: true, projectId: true },
  })
  if (!memo || memo.ownerId !== ownerId) {
    return { error: '메모를 찾을 수 없습니다' }
  }

  const parsed = parseMemoFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  const projectValidation = await validateProjectLink(
    parsed.data.projectId,
    ownerId,
  )
  if (projectValidation.error) return projectValidation

  await prisma.memo.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      projectId: parsed.data.projectId,
    },
  })

  revalidatePath('/memos')
  revalidatePath(`/memos/${id}`)
  if (memo.projectId) revalidatePath(`/projects/${memo.projectId}`)
  if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`)
  redirect(`/memos/${id}`)
}

export async function deleteMemo(id: string): Promise<ActionResult> {
  await requireMenuWrite('/memos')
  const ownerId = await ensureAuthenticated()
  const memo = await prisma.memo.findUnique({
    where: { id },
    select: { ownerId: true, projectId: true },
  })
  if (!memo || memo.ownerId !== ownerId) {
    return { error: '메모를 찾을 수 없습니다' }
  }

  await prisma.memo.delete({ where: { id } })

  revalidatePath('/memos')
  if (memo.projectId) revalidatePath(`/projects/${memo.projectId}`)
  redirect('/memos')
}

export async function deleteMemoFormAction(id: string): Promise<void> {
  await requireMenuWrite('/memos')
  const result = await deleteMemo(id)
  if (result.error) throw new Error(result.error)
}
