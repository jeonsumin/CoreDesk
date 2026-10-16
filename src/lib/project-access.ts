export type ProjectMemberRole = 'PM' | 'DEVELOPER' | 'VIEWER'

export function canManageProject(p: {
  userRole: string
  isOwner: boolean
  memberRole?: ProjectMemberRole | null
}): boolean {
  return p.userRole === 'ADMIN' || p.isOwner || p.memberRole === 'PM'
}
