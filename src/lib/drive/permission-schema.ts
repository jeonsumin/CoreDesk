import { z } from 'zod'
import { MENU_ACCESS, PERMISSION_ROLES } from '../menu/menu-schema'

export const folderPermsSchema = z
  .array(
    z.object({
      role: z.enum(PERMISSION_ROLES),
      access: z.enum(MENU_ACCESS),
    })
  )
  .max(3)
  .refine(
    (perms) => {
      // Check for duplicate roles
      const roles = perms.map((p) => p.role)
      return roles.length === new Set(roles).size
    },
    { message: '역할이 중복되었습니다' }
  )

export type FolderPerms = z.infer<typeof folderPermsSchema>
