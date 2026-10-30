import { getCurrentDbUser } from '@/lib/admin'
import { getCachedMenus } from './cache'
import { NO_PERMISSION, resolveMenuPermission, type MenuPermission, type PermissionAction } from './resolve'

export async function getMenuPermission(path: string): Promise<MenuPermission> {
  const user = await getCurrentDbUser()
  if (!user) return NO_PERMISSION
  return resolveMenuPermission(await getCachedMenus(), user, path)
}

export async function requireMenuPermission(path: string, action: PermissionAction): Promise<void> {
  if (!(await getMenuPermission(path))[action]) throw new Error('Forbidden')
}
