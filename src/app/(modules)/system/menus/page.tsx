import { Menu } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { buildMenuTree, type MenuTreeNode } from '@/lib/menu/resolve'
import { MenuTable, type MenuRow } from './_components/MenuTable'
import { MenuFormDialog } from './_components/MenuFormDialog'

export default async function MenusPage() {
  const menus = await prisma.menu.findMany()
  // 정렬만 필요하므로 권한은 비워 둔다
  const tree = buildMenuTree(menus.map((m) => ({ ...m, permissions: [] })))

  const rows: MenuRow[] = []
  const walk = (nodes: MenuTreeNode[], level: number) => {
    nodes.forEach((n, i) => {
      rows.push({
        id: n.id,
        title: n.title,
        type: n.type,
        path: n.path,
        icon: n.icon,
        section: n.section,
        parentId: n.parentId,
        status: n.status,
        isSystem: n.isSystem,
        level,
        isFirst: i === 0,
        isLast: i === nodes.length - 1,
      })
      walk(n.children, level + 1)
    })
  }
  walk(tree, 0)

  const groups = menus
    .filter((m) => m.type === 'GROUP' && !m.isSystem)
    .map((m) => ({ id: m.id, title: m.title }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader title="메뉴관리" actions={<MenuFormDialog mode="create" groups={groups} />} />

      <Panel className="flex-1">
        <PanelHeader icon={<Menu />} title="메뉴" count={menus.length} />
        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Menu />}
                title="등록된 메뉴가 없습니다"
                description="메뉴를 추가하면 사이드바에 나타납니다."
                action={<MenuFormDialog mode="create" groups={groups} />}
              />
            </div>
          ) : (
            <MenuTable rows={rows} groups={groups} />
          )}
        </div>
      </Panel>
    </div>
  )
}
