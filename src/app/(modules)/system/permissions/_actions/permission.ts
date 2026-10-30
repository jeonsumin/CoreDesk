'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { invalidateMenuCache } from '@/lib/menu/cache'
import { groupNameSchema } from '@/lib/menu/menu-schema'
import { PERMISSION_ACTIONS, type MenuPermission } from '@/lib/menu/resolve'

type ActionResult = { ok: true } | { error: string }

const DUPLICATE_NAME = '같은 이름의 권한이 이미 있습니다'

function done(): ActionResult {
  invalidateMenuCache()
  revalidatePath('/', 'layout')
  return { ok: true }
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'

export async function createGroup(name: string): Promise<{ id: string } | { error: string }> {
  await requireAdmin()
  const parsed = groupNameSchema.safeParse(name)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const last = await prisma.permissionGroup.aggregate({ _max: { sortOrder: true } })
    const group = await prisma.permissionGroup.create({
      data: { name: parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    })
    done()
    return { id: group.id }
  } catch (e) {
    if (isUniqueViolation(e)) return { error: DUPLICATE_NAME }
    throw e
  }
}

export async function renameGroup(id: string, name: string): Promise<ActionResult> {
  await requireAdmin()
  const parsed = groupNameSchema.safeParse(name)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const { count } = await prisma.permissionGroup.updateMany({ where: { id }, data: { name: parsed.data } })
    if (count === 0) return { error: '권한을 찾을 수 없습니다' }
  } catch (e) {
    if (isUniqueViolation(e)) return { error: DUPLICATE_NAME }
    throw e
  }
  return done()
}

// 소속 사용자는 그룹 없음이 되고(메뉴 권한 없음), 메뉴·폴더 권한 행은 함께 지워진다
export async function deleteGroup(id: string): Promise<ActionResult> {
  await requireAdmin()
  await prisma.permissionGroup.deleteMany({ where: { id } })
  return done()
}

// 사용자는 그룹 하나에만 속하므로 체크하면 기존 그룹에서 옮겨 온다
export async function setGroupMember(
  groupId: string,
  userId: string,
  member: boolean,
): Promise<ActionResult> {
  await requireAdmin()
  if (member) {
    const group = await prisma.permissionGroup.findUnique({ where: { id: groupId }, select: { id: true } })
    if (!group) return { error: '권한을 찾을 수 없습니다' }
    await prisma.user.updateMany({ where: { id: userId }, data: { groupId } })
  } else {
    await prisma.user.updateMany({ where: { id: userId, groupId }, data: { groupId: null } })
  }
  return done()
}

export async function setMenuPermission(
  groupId: string,
  menuId: string,
  permission: MenuPermission,
): Promise<ActionResult> {
  await requireAdmin()
  if (!PERMISSION_ACTIONS.every((a) => typeof permission?.[a] === 'boolean')) {
    return { error: '올바르지 않은 권한 값입니다' }
  }

  const menu = await prisma.menu.findUnique({ where: { id: menuId }, select: { type: true, isSystem: true } })
  if (!menu || menu.isSystem || menu.type === 'GROUP') return { error: '권한을 설정할 수 없는 메뉴입니다' }

  // 외부 링크는 보이기(읽기)만 의미가 있다
  const isLink = menu.type === 'LINK'
  const data = {
    canRead: permission.read,
    canCreate: !isLink && permission.read && permission.create,
    canUpdate: !isLink && permission.read && permission.update,
    canDelete: !isLink && permission.read && permission.delete,
  }

  try {
    if (data.canRead) {
      await prisma.menuPermission.upsert({
        where: { menuId_groupId: { menuId, groupId } },
        create: { menuId, groupId, ...data },
        update: data,
      })
    } else {
      await prisma.menuPermission.deleteMany({ where: { menuId, groupId } })
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return { error: '권한을 찾을 수 없습니다' }
    }
    throw e
  }
  return done()
}
