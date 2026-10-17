import { notFound, redirect } from 'next/navigation'
import { FilePlus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMenuAccess } from '@/lib/menu/access'
import { MemoForm } from '../_components/MemoForm'
import { FormPanel } from '@/components/layout/FormPanel'

type Props = {
  searchParams: Promise<{ projectId?: string }>
}

export const dynamic = 'force-dynamic'

export default async function NewMemoPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((await getMenuAccess('/memos')) !== 'WRITE') notFound()

  const params = await searchParams
  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    select: { id: true, name: true },
    orderBy: { updatedAt: 'desc' },
  })

  const defaultProjectId = projects.some(
    (project) => project.id === params.projectId,
  )
    ? params.projectId
    : undefined

  return (
    <FormPanel wide
      icon={<FilePlus />}
      title={defaultProjectId ? '프로젝트 메모 작성' : '새 메모 작성'}
      description="블록 기반 에디터로 메모를 작성합니다. '/'를 입력하면 블록 종류를 바꿀 수 있습니다."
    >
      <MemoForm projects={projects} defaultProjectId={defaultProjectId} />
    </FormPanel>
  )
}
