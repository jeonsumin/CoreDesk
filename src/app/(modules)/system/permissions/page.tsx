import { ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { SegmentedTabs } from '@/components/layout/SegmentedTabs'
import { buildMenuTree, toMenuPermission, type MenuTreeNode } from '@/lib/menu/resolve'
import { GroupList } from './_components/GroupList'
import { GroupUsers, type GroupUserRow } from './_components/GroupUsers'
import { GroupMenus, type GroupMenuRow } from './_components/GroupMenus'

type Tab = 'users' | 'menus'

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; tab?: string }>
}) {
  await requireAdmin()
  const params = await searchParams
  const tab: Tab = params.tab === 'menus' ? 'menus' : 'users'

  const groups = await prisma.permissionGroup.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { users: true } } },
  })
  const selected = groups.find((g) => g.id === params.group) ?? groups[0] ?? null
  const href = (t: Tab) => `/system/permissions?group=${selected?.id ?? ''}&tab=${t}`

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader title="권한관리" />

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <GroupList
          groups={groups.map((g) => ({ id: g.id, name: g.name, userCount: g._count.users }))}
          selectedId={selected?.id ?? null}
          tab={tab}
        />

        <Panel>
          {selected ? (
            <>
              <PanelHeader
                icon={<ShieldCheck />}
                title={selected.name}
                actions={
                  <SegmentedTabs
                    size="sm"
                    activeKey={tab}
                    items={[
                      { key: 'users', label: '사용자', href: href('users'), count: selected._count.users },
                      { key: 'menus', label: '메뉴', href: href('menus') },
                    ]}
                  />
                }
              />
              <div className="min-h-0 flex-1 overflow-auto">
                {tab === 'users' ? (
                  <GroupUsers key={selected.id} groupId={selected.id} rows={await loadUsers(groups)} />
                ) : (
                  <GroupMenus key={selected.id} groupId={selected.id} rows={await loadMenus(selected.id)} />
                )}
              </div>
            </>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={<ShieldCheck />}
                title="권한을 선택하세요"
                description="왼쪽에서 권한을 추가하면 사용자와 메뉴 권한을 설정할 수 있습니다."
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

async function loadUsers(groups: { id: string; name: string }[]): Promise<GroupUserRow[]> {
  const groupName = new Map(groups.map((g) => [g.id, g.name]))
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, email: true, isActive: true, groupId: true },
  })
  return users.map((u) => ({
    ...u,
    groupName: u.groupId ? (groupName.get(u.groupId) ?? null) : null,
  }))
}

async function loadMenus(groupId: string): Promise<GroupMenuRow[]> {
  const menus = await prisma.menu.findMany({
    include: {
      permissions: {
        where: { groupId },
        select: { groupId: true, canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      },
    },
  })

  const rows: GroupMenuRow[] = []
  const walk = (nodes: MenuTreeNode[], level: number) => {
    for (const n of nodes) {
      rows.push({
        id: n.id,
        title: n.title,
        type: n.type,
        icon: n.icon,
        isSystem: n.isSystem,
        level,
        permission: toMenuPermission(n.permissions[0]),
      })
      walk(n.children, level + 1)
    }
  }
  walk(buildMenuTree(menus), 0)
  return rows
}
