import type { RoleValue } from '../system/user-schema'
import type { MenuSection, MenuStatusValue, MenuTypeValue } from './menu-schema'
import type { IconName } from './icon-names'

export const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete'] as const
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]
export type MenuPermission = Record<PermissionAction, boolean>

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  read: '읽기',
  create: '쓰기',
  update: '수정',
  delete: '삭제',
}

export const FULL_PERMISSION: MenuPermission = { read: true, create: true, update: true, delete: true }
export const NO_PERMISSION: MenuPermission = { read: false, create: false, update: false, delete: false }

export type MenuPermissionRow = {
  groupId: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export type MenuRecord = {
  id: string
  title: string
  type: MenuTypeValue
  path: string | null
  icon: IconName | string
  parentId: string | null
  sortOrder: number
  status: MenuStatusValue
  isSystem: boolean
  section: MenuSection | string | null
  permissions: MenuPermissionRow[]
}

export type MenuTreeNode = MenuRecord & { children: MenuTreeNode[] }

export type MenuViewer = { role: RoleValue; groupId: string | null }

// 읽기 없이 쓰기·수정·삭제만 있는 상태는 메뉴가 숨겨져 의미가 없으므로 만들지 않는다
export function togglePermission(
  current: MenuPermission,
  action: PermissionAction,
  checked: boolean,
): MenuPermission {
  if (action === 'read' && !checked) return NO_PERMISSION
  return { ...current, [action]: checked, read: current.read || checked }
}

export const toMenuPermission = (row: MenuPermissionRow | undefined): MenuPermission =>
  row
    ? { read: row.canRead, create: row.canCreate, update: row.canUpdate, delete: row.canDelete }
    : NO_PERMISSION

const permissionFor = (menu: MenuRecord, viewer: MenuViewer): MenuPermission =>
  menu.isSystem ? NO_PERMISSION : toMenuPermission(menu.permissions.find((p) => p.groupId === viewer.groupId))

export function resolveMenuPermission(
  menus: MenuRecord[],
  viewer: MenuViewer,
  pathname: string,
): MenuPermission {
  if (viewer.role === 'ADMIN') return FULL_PERMISSION
  let best: MenuRecord | null = null
  for (const m of menus) {
    if (m.type !== 'PAGE' || !m.path) continue
    if (pathname !== m.path && !pathname.startsWith(`${m.path}/`)) continue
    if (!best || m.path.length > (best.path ?? '').length) best = m
  }
  return best ? permissionFor(best, viewer) : FULL_PERMISSION
}

const byOrder = (a: MenuRecord, b: MenuRecord) =>
  a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)

export function buildMenuTree(menus: MenuRecord[]): MenuTreeNode[] {
  const nodes = new Map<string, MenuTreeNode>(menus.map((m) => [m.id, { ...m, children: [] }]))
  const roots: MenuTreeNode[] = []
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined
    ;(parent ? parent.children : roots).push(n)
  }
  const sort = (list: MenuTreeNode[]) => {
    list.sort(byOrder)
    list.forEach((n) => sort(n.children))
  }
  sort(roots)
  return roots
}

export function filterVisibleMenus(tree: MenuTreeNode[], viewer: MenuViewer): MenuTreeNode[] {
  if (viewer.role === 'ADMIN') return tree
  const out: MenuTreeNode[] = []
  for (const n of tree) {
    if (n.type === 'GROUP') {
      const children = filterVisibleMenus(n.children, viewer)
      if (children.length > 0) out.push({ ...n, children })
    } else if (permissionFor(n, viewer).read) {
      out.push(n)
    }
  }
  return out
}

export function canDeleteMenu(
  menu: { isSystem: boolean },
  childCount: number,
): { ok: true } | { ok: false; error: string } {
  if (menu.isSystem) return { ok: false, error: '시스템 메뉴는 삭제할 수 없습니다' }
  if (childCount > 0) return { ok: false, error: '하위 메뉴를 먼저 옮기거나 삭제하세요' }
  return { ok: true }
}

export function reorderSiblings(
  siblings: { id: string; sortOrder: number }[],
  id: string,
  direction: 'up' | 'down',
): { id: string; sortOrder: number }[] {
  const ordered = siblings
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.sortOrder - b.s.sortOrder || a.i - b.i)
    .map((x) => x.s)
  const from = ordered.findIndex((s) => s.id === id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from < 0 || to < 0 || to >= ordered.length) return []
  ;[ordered[from], ordered[to]] = [ordered[to], ordered[from]]
  return ordered
    .map((s, i) => ({ id: s.id, sortOrder: i, prev: s.sortOrder }))
    .filter((s) => s.sortOrder !== s.prev)
    .map(({ id, sortOrder }) => ({ id, sortOrder }))
    .sort((a, b) => a.id.localeCompare(b.id))
}
