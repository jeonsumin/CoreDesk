'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const taskSchema = z.object({
  title: z.string().min(1, '태스크명을 입력해주세요').max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  assigneeId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v !== '' ? v : null)),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v !== '' ? new Date(v) : null)),
})

export async function createTask(projectId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const raw = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    status: formData.get('status') || 'TODO',
    priority: formData.get('priority') || 'MEDIUM',
    assigneeId: formData.get('assigneeId') || null,
    dueDate: formData.get('dueDate') || undefined,
  }

  const parsed = taskSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.task.create({
    data: { ...parsed.data, projectId },
  })

  revalidatePath(`/projects/${projectId}/tasks`)
  return { ok: true }
}

export async function updateTask(
  taskId: string,
  projectId: string,
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const raw = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    status: formData.get('status') || undefined,
    priority: formData.get('priority') || undefined,
    assigneeId: formData.get('assigneeId') || null,
    dueDate: formData.get('dueDate') || undefined,
  }

  const parsed = taskSchema.partial().safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.task.update({ where: { id: taskId }, data: parsed.data })

  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath('/my-tasks')
  return { ok: true }
}

export async function updateTaskStatus(
  taskId: string,
  projectId: string,
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE',
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.task.update({ where: { id: taskId }, data: { status } })

  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath('/my-tasks')
}

export async function deleteTask(taskId: string, projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.task.delete({ where: { id: taskId } })

  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath('/my-tasks')
}
