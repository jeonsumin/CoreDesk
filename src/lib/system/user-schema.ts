import { z } from 'zod'

export const ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const
export type RoleValue = (typeof ROLES)[number]

export const ROLE_LABELS: Record<RoleValue, string> = {
  ADMIN: '최고관리자',
  MANAGER: '매니저',
  MEMBER: '멤버',
  VIEWER: '열람자',
}

const PASSWORD_MESSAGE = '비밀번호는 6자 이상이어야 합니다'

const baseFields = {
  name: z.string().trim().min(1, '이름은 1~50자로 입력해주세요').max(50, '이름은 1~50자로 입력해주세요'),
  email: z.string().trim().toLowerCase().email('올바른 이메일을 입력해주세요'),
  role: z.enum(ROLES),
}

export const createUserSchema = z.object({
  ...baseFields,
  password: z.string().min(6, PASSWORD_MESSAGE),
})

export const updateUserSchema = z.object({
  ...baseFields,
  password: z.string().refine((v) => v === '' || v.length >= 6, PASSWORD_MESSAGE),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
