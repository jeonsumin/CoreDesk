import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FilePlus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  const memos = await prisma.memo.findMany({
    where: { ownerId: session.user.id, projectId: null },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  // 날짜는 서버에서 문자열로 만들어 넘긴다 (클라이언트 시간대 차이로 인한 hydration 불일치 방지)
  const items = memos.map((memo) => ({
    id: memo.id,
    title: memo.title,
    updatedAt: formatDate(memo.updatedAt),
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader
        title="메모"
        actions={
          <Link
            href="/memos/new"
            aria-label="새 메모"
            title="새 메모"
            className={buttonVariants({ size: 'icon-lg' })}
          >
            <FilePlus />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 gap-4">
        <MemoListPanel memos={items} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
