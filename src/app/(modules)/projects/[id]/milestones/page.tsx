import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MilestoneItem } from './_components/MilestoneItem'
import { MilestoneForm } from './_components/MilestoneForm'

type Props = { params: Promise<{ id: string }> }

export default async function MilestonesPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { dueDate: 'asc' } },
      members: true,
    },
  })

  if (!project) notFound()

  const isMember = project.members.some((m) => m.userId === session.user.id)
  if (!isMember) notFound()

  const completed = project.milestones.filter((m) => m.isCompleted)
  const pending = project.milestones.filter((m) => !m.isCompleted)
  const nowMs = new Date().getTime()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">마일스톤</h1>
          <p className="text-muted-foreground">
            {project.name} · {completed.length}/{project.milestones.length} 완료
          </p>
        </div>
        <Dialog>
          <DialogTrigger render={<Button />}>마일스톤 추가</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 마일스톤</DialogTitle>
            </DialogHeader>
            <MilestoneForm projectId={id} />
          </DialogContent>
        </Dialog>
      </div>

      {project.milestones.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">아직 마일스톤이 없습니다.</p>
          <Dialog>
            <DialogTrigger render={<Button />}>첫 마일스톤 추가하기</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 마일스톤</DialogTitle>
              </DialogHeader>
              <MilestoneForm projectId={id} />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                진행 중 ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((m) => (
                  <MilestoneItem
                    key={m.id}
                    milestone={m}
                    projectId={id}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                완료 ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map((m) => (
                  <MilestoneItem
                    key={m.id}
                    milestone={m}
                    projectId={id}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
