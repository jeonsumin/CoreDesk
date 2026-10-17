import Link from 'next/link'
import { Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { SegmentedTabs } from '@/components/layout/SegmentedTabs'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import { UserTable } from './_components/UserTable'
import { UserFilters } from './_components/UserFilters'
import { UserFormDialog } from './_components/UserFormDialog'

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>
}

const STATUS_TABS = [
  { key: 'active', label: '활성' },
  { key: 'inactive', label: '비활성' },
  { key: 'all', label: '전체' },
]

export default async function UsersPage({ searchParams }: Props) {
  await requireAdmin()
  const session = await auth()
  const { q, status = 'active' } = await searchParams

  const users = await prisma.user.findMany({
    where: {
      ...(q && { OR: [{ name: { contains: q } }, { email: { contains: q } }] }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const isFiltered = Boolean(q) || status !== 'active'
  // 상태 탭을 바꿔도 검색어는 유지한다
  const tabHref = (key: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (key !== 'active') params.set('status', key)
    const query = params.toString()
    return query ? `/system/users?${query}` : '/system/users'
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader
        title="사용자관리"
        tabs={
          <SegmentedTabs
            activeKey={status}
            items={STATUS_TABS.map((tab) => ({ ...tab, href: tabHref(tab.key) }))}
          />
        }
        actions={<UserFormDialog mode="create" />}
      />

      <Panel className="flex-1">
        <PanelHeader
          icon={<Users />}
          title="사용자"
          count={users.length}
          actions={<UserFilters />}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {users.length === 0 ? (
            <div className="p-4">
              {isFiltered ? (
                <EmptyState
                  icon={<Users />}
                  title="조건에 맞는 사용자가 없습니다."
                  description="검색어나 상태 필터를 바꿔 보세요."
                  action={
                    <Link href="/system/users" className={cn(buttonVariants({ variant: 'outline' }))}>
                      필터 초기화
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Users />}
                  title="아직 사용자가 없습니다."
                  description="팀원 계정을 만들면 프로젝트에 초대할 수 있습니다."
                  action={<UserFormDialog mode="create" />}
                />
              )}
            </div>
          ) : (
            <UserTable users={users} currentUserId={session?.user?.id ?? ''} />
          )}
        </div>
      </Panel>
    </div>
  )
}
