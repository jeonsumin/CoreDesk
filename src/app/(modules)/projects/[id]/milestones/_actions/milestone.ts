'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const milestoneSchema = z.object({
  title: z.string().min(1, '마일스톤명을 입력해주세요').max(200),
  startDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v !== '' ? new Date(v) : null)),
  dueDate: z
    .string()
    .min(1, '마감일을 입력해주세요')
    .transform((v) => new Date(v)),
})

export async function createMilestone(projectId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const raw = {
    title: formData.get('title'),
    startDate: formData.get('startDate') || null,
    dueDate: formData.get('dueDate'),
  }

  const parsed = milestoneSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.milestone.create({
    data: { ...parsed.data, projectId },
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function toggleMilestone(
  milestoneId: string,
  projectId: string,
  isCompleted: boolean
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { isCompleted },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function updateMilestone(
  milestoneId: string,
  projectId: string,
  formData: FormData
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const raw = {
    title: formData.get('title'),
    startDate: formData.get('startDate') || null,
    dueDate: formData.get('dueDate'),
  }

  const parsed = milestoneSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: parsed.data,
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function deleteMilestone(milestoneId: string, projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.milestone.delete({ where: { id: milestoneId } })

  revalidatePath(`/projects/${projectId}`)
}
