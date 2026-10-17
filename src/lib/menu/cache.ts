import { prisma } from '@/lib/prisma'
import type { MenuRecord } from './resolve'

const TTL_MS = 30_000

type MenuCache = { menus: MenuRecord[]; loadedAt: number }

declare global {
  var __coredeskMenuCache: MenuCache | undefined
}

// ponytail: 프로세스 메모리 캐시. 멀티 인스턴스에서는 최대 30초 늦게 반영된다.
// 필요해지면 DB의 version 컬럼 확인이나 pub/sub으로 바꾼다.
export async function getCachedMenus(): Promise<MenuRecord[]> {
  const cache = globalThis.__coredeskMenuCache
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.menus

  const rows = await prisma.menu.findMany({
    include: { permissions: { select: { role: true, access: true } } },
  })
  const menus: MenuRecord[] = rows
  globalThis.__coredeskMenuCache = { menus, loadedAt: Date.now() }
  return menus
}

export function invalidateMenuCache(): void {
  globalThis.__coredeskMenuCache = undefined
}
