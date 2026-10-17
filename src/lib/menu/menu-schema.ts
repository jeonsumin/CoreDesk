import { z } from 'zod'
import { ICON_NAMES } from './icon-names'

export const MENU_TYPES = ['GROUP', 'PAGE', 'LINK'] as const
export type MenuTypeValue = (typeof MENU_TYPES)[number]

export const MENU_STATUSES = ['ACTIVE', 'PREPARING'] as const
export type MenuStatusValue = (typeof MENU_STATUSES)[number]

export const MENU_ACCESS = ['NONE', 'READ', 'WRITE'] as const
export type MenuAccessValue = (typeof MENU_ACCESS)[number]

export const PERMISSION_ROLES = ['MANAGER', 'MEMBER', 'VIEWER'] as const
export type PermissionRole = (typeof PERMISSION_ROLES)[number]

export const MENU_SECTIONS = ['업무', '자료', '관리'] as const
export type MenuSection = (typeof MENU_SECTIONS)[number]

export const DEFAULT_PERMISSIONS: Record<PermissionRole, MenuAccessValue> = {
  MANAGER: 'WRITE',
  MEMBER: 'WRITE',
  VIEWER: 'READ',
}

export const ACCESS_LABELS: Record<MenuAccessValue, string> = {
  NONE: '숨김',
  READ: '읽기',
  WRITE: '쓰기',
}

const RESERVED_PREFIXES = ['/system', '/api', '/login', '/portfolio']
const PAGE_PATH = /^\/[^\s?#\\%]*$/

const hasBadSegment = (path: string) =>
  path.split('/').slice(1).some((seg, i, a) => seg === '.' || seg === '..' || (seg === '' && i < a.length - 1))

const isReserved = (path: string) =>
  RESERVED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))

const isHttpUrl = (v: string) => {
  try {
    const { protocol } = new URL(v)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const menuInputSchema = z
  .object({
    type: z.enum(MENU_TYPES),
    title: z.string().trim().min(1, '이름은 1~30자로 입력해주세요').max(30, '이름은 1~30자로 입력해주세요'),
    parentId: z.string().nullable(),
    path: z.string().nullable(),
    icon: z.enum(ICON_NAMES),
    section: z.enum(MENU_SECTIONS).nullable().default(null),
    status: z.enum(MENU_STATUSES),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'GROUP') {
      if (v.parentId) {
        ctx.addIssue({ code: 'custom', path: ['parentId'], message: '그룹은 하위에 둘 수 없습니다' })
      }
      return
    }
    const path = v.path ?? ''
    if (v.type === 'PAGE') {
      if (!PAGE_PATH.test(path) || hasBadSegment(path) || (path.length > 1 && path.endsWith('/'))) {
        ctx.addIssue({ code: 'custom', path: ['path'], message: '올바른 내부 경로를 입력해주세요' })
      } else if (isReserved(path)) {
        ctx.addIssue({ code: 'custom', path: ['path'], message: '시스템 예약 경로는 사용할 수 없습니다' })
      }
    } else if (!isHttpUrl(path)) {
      ctx.addIssue({ code: 'custom', path: ['path'], message: 'http(s) URL을 입력해주세요' })
    }
  })
  .transform((v) => ({
    ...v,
    path: v.type === 'GROUP' ? null : v.path,
    section: v.parentId ? null : v.section,
  }))

const permissionsSchema = z.object({
  MANAGER: z.enum(MENU_ACCESS),
  MEMBER: z.enum(MENU_ACCESS),
  VIEWER: z.enum(MENU_ACCESS),
})

export const menuCreateSchema = z
  .object({ permissions: permissionsSchema.default(DEFAULT_PERMISSIONS) })
  .and(menuInputSchema)

export type MenuInput = z.infer<typeof menuInputSchema>
export type MenuCreateInput = z.infer<typeof menuCreateSchema>
