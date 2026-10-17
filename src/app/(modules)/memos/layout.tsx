import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FilePlus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMenuAccess } from '@/lib/menu/access'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { MemoListPanel } from './_components/MemoListPanel'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default async function MemosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const canWrite = (await getMenuAccess('/memos')) === 'WRITE'

  const memos = await prisma.memo.findMany({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // 날짜는 서버에서 문자열로 만들어 넘긴다 (클라이언트 시간대 차이로 인한 hydration 불일치 방지)
  const items = memos.map((memo) => ({
    id: memo.id,
    title: memo.title,
    updatedAt: formatDate(memo.updatedAt),
    projectName: memo.project?.name ?? null,
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader
        title="메모"
        actions={
          canWrite && (
          <Link
            href="/memos/new"
            aria-label="새 메모"
            title="새 메모"
            className={buttonVariants({ size: 'icon-lg' })}
          >
            <FilePlus />
          </Link>
          )
        }
      />
      <div className="flex min-h-0 flex-1 gap-4">
        <MemoListPanel memos={items} canWrite={canWrite} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
