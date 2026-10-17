import { ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { buildMenuTree, type MenuTreeNode } from '@/lib/menu/resolve'
import { PERMISSION_ROLES, type MenuAccessValue, type PermissionRole } from '@/lib/menu/menu-schema'
import { PermissionMatrix, type PermissionRow } from './_components/PermissionMatrix'

export default async function PermissionsPage() {
  const menus = await prisma.menu.findMany({
    include: { permissions: { select: { role: true, access: true } } },
  })
  const tree = buildMenuTree(menus)

  const rows: PermissionRow[] = []
  const walk = (nodes: MenuTreeNode[], level: number) => {
    for (const n of nodes) {
      const access = Object.fromEntries(
        PERMISSION_ROLES.map((r) => [r, n.permissions.find((p) => p.role === r)?.access ?? 'NONE']),
      ) as Record<PermissionRole, MenuAccessValue>
      rows.push({
        id: n.id,
        title: n.title,
        type: n.type,
        section: n.section,
        icon: n.icon,
        isSystem: n.isSystem,
        level,
        access,
      })
      walk(n.children, level + 1)
    }
  }
  walk(tree, 0)

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader title="권한관리" />

      <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        읽기 전용은 현재 메모 메뉴에 적용되어 있으며, 다른 기존 메뉴는 순차 적용 예정입니다. 해당 메뉴에서
        &apos;읽기&apos;는 &apos;쓰기&apos;와 같이 동작합니다.
      </p>

      <Panel className="flex-1">
        <PanelHeader icon={<ShieldCheck />} title="메뉴별 권한" count={rows.length} />
        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<ShieldCheck />}
                title="등록된 메뉴가 없습니다"
                description="메뉴관리에서 메뉴를 추가하면 권한을 설정할 수 있습니다."
              />
            </div>
          ) : (
            <PermissionMatrix rows={rows} />
          )}
        </div>
      </Panel>
    </div>
  )
}
