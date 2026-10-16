import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { UserTable } from './_components/UserTable'
import { UserFilters } from './_components/UserFilters'
import { UserFormDialog } from './_components/UserFormDialog'

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function UsersPage({ searchParams }: Props) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">사용자관리</h1>
          <p className="text-muted-foreground">사용자 {users.length}명</p>
        </div>
        <UserFormDialog mode="create" />
      </div>

      <UserFilters />

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          {isFiltered ? (
            <>
              <p className="text-muted-foreground mb-4">
                조건에 맞는 사용자가 없습니다
              </p>
              <Link href="/system/users" className={buttonVariants()}>
                필터 초기화
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">아직 사용자가 없습니다.</p>
              <UserFormDialog mode="create" />
            </>
          )}
        </div>
      ) : (
        <UserTable users={users} currentUserId={session?.user?.id ?? ''} />
      )}
    </div>
  )
}
