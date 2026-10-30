import { z } from 'zod'

// 공유는 사용자별 읽기 또는 쓰기. 목록에 없는 사용자는 공유받지 않는다
export const folderPermsSchema = z
  .array(
    z.object({
      userId: z.string().min(1),
      access: z.enum(['READ', 'WRITE']),
    })
  )
  .max(500)
  .refine(
    (perms) => {
      const users = perms.map((p) => p.userId)
      return users.length === new Set(users).size
    },
    { message: '사용자가 중복되었습니다' }
  )

export type FolderPerms = z.infer<typeof folderPermsSchema>

// 쓰기는 읽기를 포함한다. 읽기를 끄면 그 사용자 공유가 빠진다
export function toggleShare(
  perms: FolderPerms,
  userId: string,
  kind: 'READ' | 'WRITE',
  checked: boolean
): FolderPerms {
  const rest = perms.filter((p) => p.userId !== userId)
  const current = perms.find((p) => p.userId === userId)?.access
  const next =
    kind === 'WRITE' ? (checked ? 'WRITE' : current && 'READ') : checked ? (current ?? 'READ') : undefined
  return next ? [...rest, { userId, access: next }] : rest
}
