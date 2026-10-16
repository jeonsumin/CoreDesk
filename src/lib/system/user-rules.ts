import type { RoleValue } from './user-schema'

export type UserState = { id: string; role: RoleValue; isActive: boolean }
export type UserPatch = { role?: RoleValue; isActive?: boolean }
export type RuleResult = { ok: true } | { ok: false; error: string }

export function canChangeUser(
  actorId: string,
  target: UserState,
  patch: UserPatch,
  activeAdminCount: number
): RuleResult {
  const isSelf = actorId === target.id

  // Rule 1: Can't deactivate yourself
  if (isSelf && patch.isActive === false) {
    return { ok: false, error: '자기 자신은 비활성화할 수 없습니다' }
  }

  // Rule 2: Can't change yourself to non-ADMIN role
  if (isSelf && patch.role !== undefined && patch.role !== 'ADMIN') {
    return { ok: false, error: '자기 자신의 관리자 권한은 해제할 수 없습니다' }
  }

  // Rule 3: Can't remove the last active ADMIN
  // Target is currently active ADMIN, and after patch would no longer be active ADMIN
  const targetIsCurrentlyActiveAdmin = target.role === 'ADMIN' && target.isActive
  const patchedRole = patch.role !== undefined ? patch.role : target.role
  const patchedIsActive = patch.isActive !== undefined ? patch.isActive : target.isActive
  const targetWouldBeActiveAdmin = patchedRole === 'ADMIN' && patchedIsActive

  if (targetIsCurrentlyActiveAdmin && !targetWouldBeActiveAdmin && activeAdminCount <= 1) {
    return { ok: false, error: '활성 관리자가 최소 1명 필요합니다' }
  }

  // Rule 4: Everything else is allowed
  return { ok: true }
}
