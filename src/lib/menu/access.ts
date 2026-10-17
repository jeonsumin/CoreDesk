import { getCurrentDbUser } from '@/lib/admin'
import { getCachedMenus } from './cache'
import type { MenuAccessValue } from './menu-schema'
import { resolveMenuAccess } from './resolve'

export async function getMenuAccess(path: string): Promise<MenuAccessValue> {
  const user = await getCurrentDbUser()
  if (!user) return 'NONE'
  return resolveMenuAccess(await getCachedMenus(), user.role, path)
}

export async function requireMenuWrite(path: string): Promise<void> {
  if ((await getMenuAccess(path)) !== 'WRITE') throw new Error('Forbidden')
}
