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
import { Flag, Plus } from 'lucide-react'
import { CountBadge, EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
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

  const newMilestoneDialog = (trigger: React.ReactElement) => (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 마일스톤</DialogTitle>
        </DialogHeader>
        <MilestoneForm projectId={id} />
      </DialogContent>
    </Dialog>
  )

  const groups = [
    { key: 'pending', label: '진행 중', items: pending },
    { key: 'completed', label: '완료', items: completed },
  ]

  return (
    <Panel className="flex-1">
      <PanelHeader
        icon={<Flag />}
        title={`${project.name} 마일스톤 · ${completed.length}/${project.milestones.length} 완료`}
        actions={newMilestoneDialog(
          <Button size="icon" aria-label="마일스톤 추가" title="마일스톤 추가">
            <Plus />
          </Button>,
        )}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {project.milestones.length === 0 ? (
          <EmptyState
            icon={<Flag />}
            title="아직 마일스톤이 없습니다."
            description="주요 일정과 목표를 마일스톤으로 등록하세요."
            action={newMilestoneDialog(
              <Button>
                <Plus data-icon="inline-start" />첫 마일스톤 추가하기
              </Button>,
            )}
          />
        ) : (
          <div className="space-y-6">
            {groups.map(
              (group) =>
                group.items.length > 0 && (
                  <section key={group.key}>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      {group.label}
                      <CountBadge>{group.items.length}</CountBadge>
                    </h3>
                    <div className="border-t">
                      {group.items.map((m) => (
                        <MilestoneItem
                          key={m.id}
                          milestone={m}
                          projectId={id}
                          nowMs={nowMs}
                        />
                      ))}
                    </div>
                  </section>
                ),
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
