import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Plus, Search, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { auth } from '@/lib/auth'
import { parseMemoSearchParams } from '@/lib/memo/validation'
import { prisma } from '@/lib/prisma'
import { MemoCard } from './_components/MemoCard'
import type { Prisma } from '@prisma/client'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export const dynamic = 'force-dynamic'

export default async function MemosPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">메모</h1>
          <p className="text-muted-foreground">
            {q ? `제목 검색 결과 ${memos.length}개` : `내 메모 ${memos.length}개`}
          </p>
        </div>
        <Link href="/memos/new" className={buttonVariants()}>
          <Plus size={14} />
          새 메모
        </Link>
      </div>

      <div className="space-y-4">
        <form className="flex flex-wrap gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              name="q"
              defaultValue={q ?? ''}
              placeholder="제목으로 검색"
              aria-label="메모 제목 검색"
            />
          </div>
          <Button type="submit" variant="outline">
            <Search size={14} />
            검색
          </Button>
          {q && (
            <Link href="/memos" className={buttonVariants({ variant: 'ghost' })}>
              <X size={14} />
              초기화
            </Link>
          )}
        </form>

        {memos.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <FileText
              size={40}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <p className="mb-4 text-muted-foreground">
              {q
                ? '검색된 메모가 없습니다.'
                : '아직 작성한 메모가 없습니다.'}
            </p>
            <Link href="/memos/new" className={buttonVariants()}>
              첫 메모 작성하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {memos.map((memo) => (
              <MemoCard key={memo.id} memo={memo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
