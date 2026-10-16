export const PROJECT_MEMBER_ROLES = ['PM', 'DEVELOPER', 'VIEWER'] as const
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number]

export function isProjectMemberRole(v: unknown): v is ProjectMemberRole {
  return typeof v === 'string' && (PROJECT_MEMBER_ROLES as readonly string[]).includes(v)
}

export function canManageProject(p: {
  userRole: string
  isOwner: boolean
  memberRole?: ProjectMemberRole | null
}): boolean {
  return p.userRole === 'ADMIN' || p.isOwner || p.memberRole === 'PM'
}
