import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness, Code2, ExternalLink, ImageIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { StatCard } from '@/components/layout/StatCard'
import { auth } from '@/lib/auth'
import { toStringArray } from '@/lib/json-array'
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

  const imageCount = portfolios.reduce((sum, p) => sum + p.images.length, 0)
  const linkCount = portfolios.reduce((sum, p) => sum + p.links.length, 0)
  const techSpecCount = new Set(portfolios.flatMap((p) => toStringArray(p.techSpecs)))
    .size

  return (
    <Panel className="flex-1">
      <PanelHeader
        icon={<BriefcaseBusiness />}
        title="포트폴리오 현황"
        count={portfolios.length}
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={<BriefcaseBusiness />}
            label="포트폴리오"
            value={`${portfolios.length}개`}
          />
          <StatCard icon={<ImageIcon />} label="스크린샷" value={imageCount} />
          <StatCard icon={<ExternalLink />} label="등록 URI" value={linkCount} />
          <StatCard icon={<Code2 />} label="기술 스펙" value={techSpecCount} />
        </div>

        {portfolios.length === 0 ? (
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="아직 등록된 포트폴리오가 없습니다."
            description="작업물의 썸네일, 스크린샷, 기술 스펙과 URI를 한 곳에 정리하세요."
            action={
              <Link href="/portfolios/new" className={buttonVariants()}>
                첫 포트폴리오 만들기
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {portfolios.map((portfolio) => (
              <PortfolioCard key={portfolio.id} portfolio={portfolio} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
