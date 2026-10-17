import { notFound, redirect } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { FormPanel } from '@/components/layout/FormPanel'
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
    <FormPanel
      icon={<Pencil />}
      title="포트폴리오 수정"
      description={`'${portfolio.title}'의 정보를 수정합니다.`}
    >
      <PortfolioForm portfolio={portfolio} />
    </FormPanel>
  )
}
