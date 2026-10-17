import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PortfolioListPanel } from './_components/PortfolioListPanel'

export default async function PortfoliosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      title: true,
      thumbnailFileId: true,
      _count: { select: { images: true, links: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const items = portfolios.map((p) => ({
    id: p.id,
    title: p.title,
    thumbnailFileId: p.thumbnailFileId,
    imageCount: p._count.images,
    linkCount: p._count.links,
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader
        title="포트폴리오 관리"
        actions={
          <Link
            href="/portfolios/new"
            aria-label="새 포트폴리오"
            title="새 포트폴리오"
            className={buttonVariants({ size: 'icon-lg' })}
          >
            <Plus />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 gap-4">
        <PortfolioListPanel portfolios={items} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
