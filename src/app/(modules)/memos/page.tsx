import Link from 'next/link'
import { redirect } from 'next/navigation'
import { NotepadText, Search, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, Panel, PanelHeader, PanelToolbar } from '@/components/layout/Panel'
import { auth } from '@/lib/auth'
import { parseMemoSearchParams } from '@/lib/memo/validation'
import { prisma } from '@/lib/prisma'
import { getMenuAccess } from '@/lib/menu/access'
import { MemoCard } from './_components/MemoCard'
import type { Prisma } from '@prisma/client'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export const dynamic = 'force-dynamic'

export default async function MemosPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const canWrite = (await getMenuAccess('/memos')) === 'WRITE'
  const params = await searchParams
  const { q } = parseMemoSearchParams(params)

  const where: Prisma.MemoWhereInput = {
    ownerId: session.user.id,
    ...(q && {
      title: {
        contains: q,
      },
    }),
  }

  const memos = await prisma.memo.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <Panel className="flex-1">
      <PanelHeader
        icon={<NotepadText />}
        title={q ? `'${q}' 검색 결과` : '최근 메모'}
        count={memos.length}
        actions={
          q && (
            <Link
              href="/memos"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <X />
              초기화
            </Link>
          )
        }
      />

      {/* 좁은 화면에서는 좌측 목록 패널(검색 포함)이 숨겨지므로 검색창을 여기서 제공 */}
      <PanelToolbar className="lg:hidden">
        <form className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="제목으로 검색..."
            aria-label="메모 제목 검색"
            className="h-9 pl-9"
          />
        </form>
      </PanelToolbar>

      <div className="flex-1 overflow-y-auto p-6">
        {memos.length === 0 ? (
          <EmptyState
            icon={<NotepadText />}
            title={
              q
                ? '검색된 메모가 없습니다.'
                : canWrite
                  ? '아직 작성한 메모가 없습니다.'
                  : '등록된 메모가 없습니다'
            }
            description={
              q
                ? canWrite
                  ? '다른 검색어로 찾아보거나 새 메모를 작성하세요.'
                  : '다른 검색어로 찾아보세요.'
                : canWrite
                  ? '회의록, 아이디어, 할 일을 블록 에디터로 정리해 보세요.'
                  : undefined
            }
            action={
              canWrite ? (
                <Link href="/memos/new" className={buttonVariants()}>
                  첫 메모 작성하기
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {memos.map((memo) => (
              <MemoCard key={memo.id} memo={memo} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
