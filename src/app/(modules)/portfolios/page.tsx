import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PortfolioCard } from './_components/PortfolioCard'

export const dynamic = 'force-dynamic'

export default async function PortfoliosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: session.user.id },
    include: {
      driveFolder: true,
      thumbnailFile: true,
      links: { orderBy: { sortOrder: 'asc' } },
      images: {
        orderBy: { sortOrder: 'asc' },
        include: { file: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">포트폴리오 관리</h1>
          <p className="text-muted-foreground">
            등록된 포트폴리오 {portfolios.length}개
          </p>
        </div>
        <Link href="/portfolios/new" className={buttonVariants()}>
          <Plus size={14} />
          새 포트폴리오
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <BriefcaseBusiness
            size={40}
            className="mx-auto mb-3 text-muted-foreground"
          />
          <p className="mb-4 text-muted-foreground">
            아직 등록된 포트폴리오가 없습니다.
          </p>
          <Link href="/portfolios/new" className={buttonVariants()}>
            첫 포트폴리오 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} portfolio={portfolio} />
          ))}
        </div>
      )}
    </div>
  )
}
