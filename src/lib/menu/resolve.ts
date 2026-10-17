import type { RoleValue } from '../system/user-schema'
import type { MenuAccessValue, MenuSection, MenuStatusValue, MenuTypeValue } from './menu-schema'
import type { IconName } from './icon-names'

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
  permissions: { role: RoleValue; access: MenuAccessValue }[]
}

export type MenuTreeNode = MenuRecord & { children: MenuTreeNode[] }

const accessFor = (menu: MenuRecord, role: RoleValue): MenuAccessValue =>
  menu.isSystem ? 'NONE' : (menu.permissions.find((p) => p.role === role)?.access ?? 'NONE')

export function resolveMenuAccess(
  menus: MenuRecord[],
  role: RoleValue,
  pathname: string,
): MenuAccessValue {
  if (role === 'ADMIN') return 'WRITE'
  let best: MenuRecord | null = null
  for (const m of menus) {
    if (m.type !== 'PAGE' || !m.path) continue
    if (pathname !== m.path && !pathname.startsWith(`${m.path}/`)) continue
    if (!best || m.path.length > (best.path ?? '').length) best = m
  }
  return best ? accessFor(best, role) : 'WRITE'
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

export function filterVisibleMenus(tree: MenuTreeNode[], role: RoleValue): MenuTreeNode[] {
  if (role === 'ADMIN') return tree
  const out: MenuTreeNode[] = []
  for (const n of tree) {
    if (n.type === 'GROUP') {
      const children = filterVisibleMenus(n.children, role)
      if (children.length > 0) out.push({ ...n, children })
    } else if (accessFor(n, role) !== 'NONE') {
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
