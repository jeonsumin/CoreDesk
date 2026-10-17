import type { MenuTreeNode } from './resolve'

// 클라이언트로 내려가는 최소 필드만 둔다 (permissions 등 권한 정보는 보내지 않는다)
export type SidebarNode = Pick<
  MenuTreeNode,
  'id' | 'title' | 'icon' | 'type' | 'path' | 'status' | 'section'
> & { children: SidebarNode[] }

export function toSidebarNodes(nodes: MenuTreeNode[]): SidebarNode[] {
  return nodes.map((n) => ({
    id: n.id,
    title: n.title,
    icon: n.icon,
    type: n.type,
    path: n.path,
    status: n.status,
    section: n.section,
    children: toSidebarNodes(n.children),
  }))
}
