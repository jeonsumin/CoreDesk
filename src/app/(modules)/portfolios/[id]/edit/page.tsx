import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PortfolioForm } from '../../_components/PortfolioForm'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditPortfolioPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const portfolio = await prisma.portfolio.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      driveFolder: true,
      thumbnailFile: true,
      links: { orderBy: { sortOrder: 'asc' } },
      images: {
        orderBy: { sortOrder: 'asc' },
        include: { file: true },
      },
    },
  })

  if (!portfolio) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">포트폴리오 수정</h1>
          <p className="text-muted-foreground">{portfolio.title}</p>
        </div>
        <Link
          href={`/portfolios/${portfolio.id}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          <ArrowLeft size={14} />
          상세
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>포트폴리오 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioForm portfolio={portfolio} />
        </CardContent>
      </Card>
    </div>
  )
}
