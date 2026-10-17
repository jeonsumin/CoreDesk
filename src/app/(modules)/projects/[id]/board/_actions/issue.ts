'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { canManageProject } from '@/lib/project-access'
import type { TaskStatus } from '@/types'

type ActionResult = { error?: string; ok?: boolean }

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null))

const issueSchema = z
  .object({
    type: z.enum(['EPIC', 'STORY', 'TASK']).default('TASK'),
    title: z.string().trim().min(1, '제목을 입력해주세요').max(200),
    description: z.string().max(5000).optional().transform((v) => v || null),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    epicId: z.string().optional().transform((v) => v || null),
    startDate: optionalDate,
    dueDate: optionalDate,
    assigneeIds: z.array(z.string()).max(20),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, {
    message: '마감일은 시작일 이후여야 합니다',
  })

// 보드 화면과 같은 기준: 생성·수정·삭제는 관리자(PM/오너/ADMIN), 상태 변경은 개발자까지
async function getPermissions(projectId: string) {
  const user = await getCurrentDbUser()
  if (!user) throw new Error('Unauthorized')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, members: { where: { userId: user.id }, select: { role: true } } },
  })
  if (!project) throw new Error('Not found')

  const memberRole = project.members[0]?.role
  const isOwner = project.ownerId === user.id
  const canManage = canManageProject({ userRole: user.role, isOwner, memberRole })
  return {
    userId: user.id,
    canManage,
    canUpdateStatus: canManage || memberRole === 'DEVELOPER',
  }
}

function parseIssueForm(formData: FormData) {
  const field = (name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value : undefined
  }
  return issueSchema.safeParse({
    type: field('type'),
    title: field('title') ?? '',
    description: field('description'),
    status: field('status'),
    priority: field('priority'),
    epicId: field('epicId'),
    startDate: field('startDate'),
    dueDate: field('dueDate'),
    assigneeIds: [...new Set(formData.getAll('assigneeIds').filter((v): v is string => typeof v === 'string' && v !== ''))],
  })
}

type IssueInput = z.infer<typeof issueSchema>

// 에픽은 같은 프로젝트의 EPIC 이어야 하고, 에픽 자신은 에픽에 속할 수 없다. 담당자는 활성 멤버만
async function validateRelations(projectId: string, data: IssueInput, selfId?: string): Promise<string | null> {
  if (data.type === 'EPIC') data.epicId = null
  if (data.epicId) {
    const epic = await prisma.task.findFirst({
      where: { id: data.epicId, projectId, type: 'EPIC', NOT: selfId ? { id: selfId } : undefined },
      select: { id: true },
    })
    if (!epic) return '에픽을 찾을 수 없습니다'
  }
  if (data.assigneeIds.length > 0) {
    const count = await prisma.projectMember.count({
      where: { projectId, userId: { in: data.assigneeIds }, user: { isActive: true } },
    })
    if (count !== data.assigneeIds.length) return '담당자는 활성 프로젝트 멤버만 지정할 수 있습니다'
  }
  return null
}

function revalidateBoard(projectId: string) {
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/my-tasks')
  revalidatePath('/dashboard')
}

export async function createIssue(projectId: string, formData: FormData): Promise<ActionResult> {
  const { userId, canManage } = await getPermissions(projectId)
  if (!canManage) return { error: '이슈를 만들 권한이 없습니다' }

  const parsed = parseIssueForm(formData)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const relationError = await validateRelations(projectId, parsed.data)
  if (relationError) return { error: relationError }

  const { assigneeIds, ...data } = parsed.data
  await prisma.$transaction(async (tx) => {
    // 프로젝트별 이슈 번호 발급 (에픽도 같은 번호 체계)
    const { issueSeq } = await tx.project.update({
      where: { id: projectId },
      data: { issueSeq: { increment: 1 } },
      select: { issueSeq: true },
    })
    await tx.task.create({
      data: {
        ...data,
        projectId,
        number: issueSeq,
        createdById: userId,
        assignees: { create: assigneeIds.map((id) => ({ userId: id })) },
      },
    })
  })

  revalidateBoard(projectId)
  return { ok: true }
}

export async function updateIssue(issueId: string, projectId: string, formData: FormData): Promise<ActionResult> {
  const { canManage } = await getPermissions(projectId)
  if (!canManage) return { error: '이슈를 수정할 권한이 없습니다' }

  const issue = await prisma.task.findFirst({ where: { id: issueId, projectId }, select: { type: true } })
  if (!issue) return { error: '이슈를 찾을 수 없습니다' }

  const parsed = parseIssueForm(formData)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  // 에픽 ↔ 일반 이슈 전환은 하위 이슈 정합성 때문에 막는다
  if ((issue.type === 'EPIC') !== (parsed.data.type === 'EPIC')) {
    return { error: '에픽과 일반 이슈는 서로 바꿀 수 없습니다' }
  }
  const relationError = await validateRelations(projectId, parsed.data, issueId)
  if (relationError) return { error: relationError }

  const { assigneeIds, ...data } = parsed.data
  await prisma.task.update({
    where: { id: issueId },
    data: {
      ...data,
      assignees: { deleteMany: {}, create: assigneeIds.map((id) => ({ userId: id })) },
    },
  })

  revalidateBoard(projectId)
  return { ok: true }
}

export async function updateIssueStatus(issueId: string, projectId: string, status: TaskStatus) {
  const { canUpdateStatus } = await getPermissions(projectId)
  if (!canUpdateStatus) throw new Error('Forbidden')
  if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) throw new Error('Invalid status')

  await prisma.task.updateMany({ where: { id: issueId, projectId }, data: { status } })
  revalidateBoard(projectId)
}

export async function deleteIssue(issueId: string, projectId: string): Promise<ActionResult> {
  const { canManage } = await getPermissions(projectId)
  if (!canManage) return { error: '이슈를 삭제할 권한이 없습니다' }

  // 에픽을 지우면 하위 이슈는 '에픽 미할당'이 된다 (onDelete: SetNull)
  await prisma.task.deleteMany({ where: { id: issueId, projectId } })
  revalidateBoard(projectId)
  return { ok: true }
}
