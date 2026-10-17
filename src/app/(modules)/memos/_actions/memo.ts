'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { parseMemoFormData } from '@/lib/memo/validation'
import { prisma } from '@/lib/prisma'

type ActionResult = { error?: string }

async function ensureAuthenticated(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

// 개인 메모만 다룬다. 프로젝트 메모(projectId 있음)는 프로젝트 모듈에서 관리한다
async function findOwnMemo(id: string, ownerId: string) {
  return prisma.memo.findFirst({
    where: { id, ownerId, projectId: null },
    select: { id: true },
  })
}

export async function createMemo(formData: FormData): Promise<ActionResult> {
  const ownerId = await ensureAuthenticated()
  const parsed = parseMemoFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  const memo = await prisma.memo.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      ownerId,
    },
  })

  revalidatePath('/memos')
  redirect(`/memos/${memo.id}`)
}

export async function updateMemo(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const ownerId = await ensureAuthenticated()
  if (!(await findOwnMemo(id, ownerId))) {
    return { error: '메모를 찾을 수 없습니다' }
  }

  const parsed = parseMemoFormData(formData)
  if (!parsed.success) return { error: parsed.error }

  await prisma.memo.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
    },
  })

  revalidatePath('/memos')
  revalidatePath(`/memos/${id}`)
  redirect(`/memos/${id}`)
}

export async function deleteMemo(id: string): Promise<ActionResult> {
  const ownerId = await ensureAuthenticated()
  if (!(await findOwnMemo(id, ownerId))) {
    return { error: '메모를 찾을 수 없습니다' }
  }

  await prisma.memo.delete({ where: { id } })

  revalidatePath('/memos')
  redirect('/memos')
}

export async function deleteMemoFormAction(id: string): Promise<void> {
  const result = await deleteMemo(id)
  if (result.error) throw new Error(result.error)
}
