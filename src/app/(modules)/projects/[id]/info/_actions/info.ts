'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import {
  canManageProjectInfo,
  encryptProjectInfoPassword,
} from '@/lib/projects/project-info-security'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t): t is string => typeof t === 'string')
  } catch {
    return []
  }
}

function strOrUndef(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function encryptParsedPassword<T extends { password?: string }>(data: T): T {
  return {
    ...data,
    password: encryptProjectInfoPassword(data.password),
  }
}

async function authorizeProjectInfoManager(projectId: string) {
  const dbUser = await getCurrentDbUser()
  if (!dbUser) return { ok: false, error: '로그인이 필요합니다' }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  })

  if (!project) return { ok: false, error: '프로젝트를 찾을 수 없습니다' }

  const canManage = canManageProjectInfo(project, {
    id: dbUser.id,
    role: dbUser.role,
  })

  if (!canManage) return { ok: false, error: '권한이 없습니다' }

  return { ok: true }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const urlSchema = z.object({
  tags: z.array(z.string()).default([]),
  name: z.string().min(1, '이름을 입력해주세요').max(200),
  domain: z.string().min(1, '도메인을 입력해주세요').max(500),
  username: z.string().max(200).optional(),
  password: z.string().max(500).optional(),
  note: z.string().max(2000).optional(),
})

const accountSchema = z.object({
  tags: z.array(z.string()).default([]),
  ip: z.string().min(1, 'IP를 입력해주세요').max(200),
  username: z.string().min(1, '아이디를 입력해주세요').max(200),
  password: z.string().max(500).optional(),
  note: z.string().max(2000).optional(),
})

const dbSchema = z.object({
  tags: z.array(z.string()).default([]),
  ip: z.string().min(1, 'IP를 입력해주세요').max(200),
  username: z.string().min(1, '아이디를 입력해주세요').max(200),
  password: z.string().max(500).optional(),
  port: z.string().max(20).optional(),
  dbName: z.string().min(1, 'DB명을 입력해주세요').max(200),
  note: z.string().max(2000).optional(),
})

// ─── URL Actions ─────────────────────────────────────────────────────────────

export async function createUrl(projectId: string, formData: FormData) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const parsed = urlSchema.safeParse({
    tags: parseTags(formData.get('tags')),
    name: formData.get('name'),
    domain: formData.get('domain'),
    username: strOrUndef(formData.get('username')),
    password: strOrUndef(formData.get('password')),
    note: strOrUndef(formData.get('note')),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.projectUrl.create({
    data: { ...encryptParsedPassword(parsed.data), projectId },
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function updateUrl(
  id: string,
  projectId: string,
  formData: FormData,
) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const parsed = urlSchema.safeParse({
    tags: parseTags(formData.get('tags')),
    name: formData.get('name'),
    domain: formData.get('domain'),
    username: strOrUndef(formData.get('username')),
    password: strOrUndef(formData.get('password')),
    note: strOrUndef(formData.get('note')),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const updated = await prisma.projectUrl.updateMany({
    where: { id, projectId },
    data: encryptParsedPassword(parsed.data),
  })
  if (updated.count === 0) return { error: 'URL 정보를 찾을 수 없습니다' }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function deleteUrl(id: string, projectId: string) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const deleted = await prisma.projectUrl.deleteMany({ where: { id, projectId } })
  if (deleted.count === 0) return { error: 'URL 정보를 찾을 수 없습니다' }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

// ─── Account Actions ─────────────────────────────────────────────────────────

export async function createAccount(projectId: string, formData: FormData) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const parsed = accountSchema.safeParse({
    tags: parseTags(formData.get('tags')),
    ip: formData.get('ip'),
    username: formData.get('username'),
    password: strOrUndef(formData.get('password')),
    note: strOrUndef(formData.get('note')),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.projectAccount.create({
    data: { ...encryptParsedPassword(parsed.data), projectId },
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function updateAccount(
  id: string,
  projectId: string,
  formData: FormData,
) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const parsed = accountSchema.safeParse({
    tags: parseTags(formData.get('tags')),
    ip: formData.get('ip'),
    username: formData.get('username'),
    password: strOrUndef(formData.get('password')),
    note: strOrUndef(formData.get('note')),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const updated = await prisma.projectAccount.updateMany({
    where: { id, projectId },
    data: encryptParsedPassword(parsed.data),
  })
  if (updated.count === 0) return { error: '계정 정보를 찾을 수 없습니다' }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function deleteAccount(id: string, projectId: string) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const deleted = await prisma.projectAccount.deleteMany({
    where: { id, projectId },
  })
  if (deleted.count === 0) return { error: '계정 정보를 찾을 수 없습니다' }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

// ─── DB Actions ──────────────────────────────────────────────────────────────

export async function createDb(projectId: string, formData: FormData) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const parsed = dbSchema.safeParse({
    tags: parseTags(formData.get('tags')),
    ip: formData.get('ip'),
    username: formData.get('username'),
    password: strOrUndef(formData.get('password')),
    port: strOrUndef(formData.get('port')),
    dbName: formData.get('dbName'),
    note: strOrUndef(formData.get('note')),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await prisma.projectDb.create({
    data: { ...encryptParsedPassword(parsed.data), projectId },
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function updateDb(
  id: string,
  projectId: string,
  formData: FormData,
) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const parsed = dbSchema.safeParse({
    tags: parseTags(formData.get('tags')),
    ip: formData.get('ip'),
    username: formData.get('username'),
    password: strOrUndef(formData.get('password')),
    port: strOrUndef(formData.get('port')),
    dbName: formData.get('dbName'),
    note: strOrUndef(formData.get('note')),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const updated = await prisma.projectDb.updateMany({
    where: { id, projectId },
    data: encryptParsedPassword(parsed.data),
  })
  if (updated.count === 0) return { error: 'DB 정보를 찾을 수 없습니다' }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function deleteDb(id: string, projectId: string) {
  const authorization = await authorizeProjectInfoManager(projectId)
  if (!authorization.ok) return { error: authorization.error }

  const deleted = await prisma.projectDb.deleteMany({ where: { id, projectId } })
  if (deleted.count === 0) return { error: 'DB 정보를 찾을 수 없습니다' }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}
