import {
  decryptSecretField,
  encryptSecretField,
} from '../field-encryption'

type ProjectInfoMember = {
  userId: string
  role: string
}

type ProjectInfoProject = {
  ownerId: string
  members: readonly ProjectInfoMember[]
}

type ProjectInfoUser = {
  id: string
  role?: string | null
}

type ProjectInfoItemWithPassword = {
  password: string | null
}

export function canManageProjectInfo(
  project: ProjectInfoProject,
  user: ProjectInfoUser,
): boolean {
  if (user.role === 'ADMIN') return true
  if (project.ownerId === user.id) return true

  return project.members.some(
    (member) => member.userId === user.id && member.role === 'PM',
  )
}

export function encryptProjectInfoPassword(
  password: string | null | undefined,
): string | undefined {
  return encryptSecretField(password)
}

export function decryptProjectInfoItems<T extends ProjectInfoItemWithPassword>(
  items: readonly T[],
): T[] {
  return items.map((item) => ({
    ...item,
    password: decryptSecretField(item.password),
  }))
}
