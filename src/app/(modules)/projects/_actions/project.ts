'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { normalizeProjectKey } from '@/lib/projects/issue-key'
import { Prisma } from '@prisma/client'

const projectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요').max(100),
  key: z
    .string()
    .transform((v, ctx) => {
      const key = normalizeProjectKey(v)
      if (!key) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '프로젝트 키는 영문 대문자로 시작하는 영문·숫자·하이픈 2~20자입니다' })
        return z.NEVER
      }
      return key
    }),
  description: z.string().max(500).optional(),
  status: z
    .enum(['IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .default('IN_PROGRESS'),
  startDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
})

function duplicateKeyError(error: unknown): { error: string } {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return { error: '이미 사용 중인 프로젝트 키입니다' }
  }
  throw error
}

export async function createProject(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const raw = {
    name: formData.get('name'),
    key: formData.get('key') ?? '',
    description: formData.get('description') || undefined,
    status: formData.get('status') || 'IN_PROGRESS',
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
  }

  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const project = await prisma.project
    .create({
      data: {
        ...parsed.data,
        ownerId: session.user.id,
        members: {
          create: { userId: session.user.id, role: 'PM' },
        },
      },
    })
    .catch(duplicateKeyError)
  if ('error' in project) return project

  revalidatePath('/projects')
  redirect(`/projects/${project.id}`)
}

export async function updateProject(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project || project.ownerId !== session.user.id)
    return { error: '권한이 없습니다' }

  const raw = {
    name: formData.get('name'),
    key: formData.get('key') ?? '',
    description: formData.get('description') || undefined,
    status: formData.get('status') || undefined,
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
  }

  const parsed = projectSchema.partial().safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const updated = await prisma.project.update({ where: { id }, data: parsed.data }).catch(duplicateKeyError)
  if ('error' in updated) return updated
  revalidatePath(`/projects/${id}`)
  return { ok: true }
}

export async function deleteProject(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project || project.ownerId !== session.user.id)
    return { error: '권한이 없습니다' }

  await prisma.project.delete({ where: { id } })
  revalidatePath('/projects')
  redirect('/projects')
}

/**
 * Form-action 호환 래퍼: `<form action>`은 void 반환을 요구한다.
 * 에러는 throw 로 상위 에러 바운더리에 위임한다.
 */
export async function deleteProjectFormAction(id: string): Promise<void> {
  const result = await deleteProject(id)
  if (result && 'error' in result) {
    throw new Error(result.error)
  }
}
