'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { invalidateMenuCache } from '@/lib/menu/cache'
import {
  MENU_ACCESS,
  PERMISSION_ROLES,
  type MenuAccessValue,
  type PermissionRole,
} from '@/lib/menu/menu-schema'

const isRole = (v: unknown): v is PermissionRole =>
  typeof v === 'string' && (PERMISSION_ROLES as readonly string[]).includes(v)
const isAccess = (v: unknown): v is MenuAccessValue =>
  typeof v === 'string' && (MENU_ACCESS as readonly string[]).includes(v)

export async function setMenuPermission(
  menuId: string,
  role: string,
  access: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()

  if (!isRole(role) || !isAccess(access)) return { error: '올바르지 않은 권한 값입니다' }
  if (typeof menuId !== 'string') return { error: '권한을 설정할 수 없는 메뉴입니다' }

  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: { type: true, isSystem: true },
  })
  if (!menu || menu.isSystem || menu.type === 'GROUP') {
    return { error: '권한을 설정할 수 없는 메뉴입니다' }
  }

  const value: MenuAccessValue = menu.type === 'LINK' && access === 'WRITE' ? 'READ' : access
  await prisma.menuPermission.upsert({
    where: { menuId_role: { menuId, role } },
    create: { menuId, role, access: value },
    update: { access: value },
  })

  invalidateMenuCache()
  revalidatePath('/', 'layout')
  return { ok: true }
}
