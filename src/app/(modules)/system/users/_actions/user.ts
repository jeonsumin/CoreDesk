'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/system/user-schema'
import { canChangeUser } from '@/lib/system/user-rules'

type ActionResult = { ok: true } | { error: string }

const DUPLICATE_EMAIL = '이미 사용 중인 이메일입니다'
const NOT_FOUND = '사용자를 찾을 수 없습니다'

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  await requireAdmin()

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { name, email, role, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: DUPLICATE_EMAIL }

  await prisma.user.create({
    data: { name, email, role, password: await bcrypt.hash(password, 10) },
  })

  revalidatePath('/system/users')
  return { ok: true }
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<ActionResult> {
  const admin = await requireAdmin()

  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { name, email, role, password } = parsed.data

  const duplicate = await prisma.user.findUnique({ where: { email } })
  if (duplicate && duplicate.id !== id) return { error: DUPLICATE_EMAIL }

  const passwordHash = password === '' ? undefined : await bcrypt.hash(password, 10)

  // ponytail: REPEATABLE READ without row locks can still race under true concurrency; upgrade path: SELECT ... FOR UPDATE
  const result = await prisma.$transaction(async (tx): Promise<ActionResult> => {
    const target = await tx.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    })
    if (!target) return { error: NOT_FOUND }

    const activeAdminCount = await tx.user.count({
      where: { role: 'ADMIN', isActive: true },
    })
    const check = canChangeUser(admin.id, target, { role }, activeAdminCount)
    if (!check.ok) return { error: check.error }

    await tx.user.update({
      where: { id },
      data: { name, email, role, ...(passwordHash && { password: passwordHash }) },
    })
    return { ok: true }
  })

  if ('ok' in result) revalidatePath('/system/users')
  return result
}

export async function setUserActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const admin = await requireAdmin()

  // ponytail: REPEATABLE READ without row locks can still race under true concurrency; upgrade path: SELECT ... FOR UPDATE
  const result = await prisma.$transaction(async (tx): Promise<ActionResult> => {
    const target = await tx.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    })
    if (!target) return { error: NOT_FOUND }

    const activeAdminCount = await tx.user.count({
      where: { role: 'ADMIN', isActive: true },
    })
    const check = canChangeUser(admin.id, target, { isActive }, activeAdminCount)
    if (!check.ok) return { error: check.error }

    await tx.user.update({ where: { id }, data: { isActive } })
    return { ok: true }
  })

  if ('ok' in result) revalidatePath('/system/users')
  return result
}
