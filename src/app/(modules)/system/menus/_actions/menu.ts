'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { invalidateMenuCache } from '@/lib/menu/cache'
import {
  PERMISSION_ROLES,
  menuCreateSchema,
  menuInputSchema,
  type MenuCreateInput,
  type MenuInput,
} from '@/lib/menu/menu-schema'
import { canDeleteMenu, reorderSiblings } from '@/lib/menu/resolve'

type ActionResult = { ok: true } | { error: string }

const NOT_FOUND = '메뉴를 찾을 수 없습니다'
const SYSTEM_LOCKED = '시스템 메뉴는 변경할 수 없습니다'
const INVALID_PARENT = '올바르지 않은 상위 그룹입니다'
const DUPLICATE_PATH = '이미 사용 중인 경로입니다'

const done = (): ActionResult => {
  invalidateMenuCache()
  revalidatePath('/', 'layout')
  return { ok: true }
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'

async function validateParent(parentId: string | null): Promise<string | null> {
  if (!parentId) return null
  const parent = await prisma.menu.findUnique({
    where: { id: parentId },
    select: { type: true, isSystem: true },
  })
  return parent && parent.type === 'GROUP' && !parent.isSystem ? null : INVALID_PARENT
}

async function nextSortOrder(parentId: string | null): Promise<number> {
  const last = await prisma.menu.aggregate({ where: { parentId }, _max: { sortOrder: true } })
  return (last._max.sortOrder ?? -1) + 1
}

async function pathTaken(path: string | null, selfId?: string): Promise<boolean> {
  if (!path) return false
  const found = await prisma.menu.findUnique({ where: { path }, select: { id: true } })
  return Boolean(found && found.id !== selfId)
}

export async function createMenu(input: MenuCreateInput): Promise<ActionResult> {
  await requireAdmin()

  const parsed = menuCreateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { type, title, parentId, path, icon, section, status, permissions } = parsed.data

  const parentError = await validateParent(parentId)
  if (parentError) return { error: parentError }
  if (await pathTaken(path)) return { error: DUPLICATE_PATH }

  try {
    await prisma.$transaction(async (tx) => {
      const last = await tx.menu.aggregate({ where: { parentId }, _max: { sortOrder: true } })
      await tx.menu.create({
        data: {
          type,
          title,
          parentId,
          path,
          icon,
          section,
          status,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
          ...(type !== 'GROUP' && {
            permissions: {
              create: PERMISSION_ROLES.map((role) => ({ role, access: permissions[role] })),
            },
          }),
        },
      })
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { error: DUPLICATE_PATH }
    throw e
  }
  return done()
}

export async function updateMenu(id: string, input: MenuInput): Promise<ActionResult> {
  await requireAdmin()

  const parsed = menuInputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { type, title, parentId, path, icon, section, status } = parsed.data

  const target = await prisma.menu.findUnique({
    where: { id },
    select: { type: true, isSystem: true, parentId: true },
  })
  if (!target) return { error: NOT_FOUND }
  if (target.isSystem) return { error: SYSTEM_LOCKED }
  if (target.type !== type) return { error: '메뉴 유형은 변경할 수 없습니다' }

  if (parentId === id) return { error: INVALID_PARENT }
  const parentError = await validateParent(parentId)
  if (parentError) return { error: parentError }
  if (await pathTaken(path, id)) return { error: DUPLICATE_PATH }

  const moved = target.parentId !== parentId
  try {
    await prisma.menu.update({
      where: { id },
      data: {
        title,
        parentId,
        path,
        icon,
        section,
        status,
        ...(moved && { sortOrder: await nextSortOrder(parentId) }),
      },
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { error: DUPLICATE_PATH }
    throw e
  }
  return done()
}

export async function deleteMenu(id: string): Promise<ActionResult> {
  await requireAdmin()

  const target = await prisma.menu.findUnique({
    where: { id },
    select: { isSystem: true, _count: { select: { children: true } } },
  })
  if (!target) return { error: NOT_FOUND }

  const check = canDeleteMenu(target, target._count.children)
  if (!check.ok) return { error: check.error }

  await prisma.menu.delete({ where: { id } })
  return done()
}

export async function moveMenu(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  await requireAdmin()

  const target = await prisma.menu.findUnique({
    where: { id },
    select: { isSystem: true, parentId: true },
  })
  if (!target) return { error: NOT_FOUND }
  if (target.isSystem) return { error: SYSTEM_LOCKED }

  const siblings = await prisma.menu.findMany({
    where: { parentId: target.parentId },
    select: { id: true, sortOrder: true },
  })
  const changes = reorderSiblings(siblings, id, direction)
  if (changes.length === 0) return { ok: true }

  await prisma.$transaction(
    changes.map((c) => prisma.menu.update({ where: { id: c.id }, data: { sortOrder: c.sortOrder } })),
  )
  return done()
}
