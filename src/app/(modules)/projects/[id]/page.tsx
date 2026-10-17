import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { canManageProject } from '@/lib/project-access'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Settings, Trash2, Users } from 'lucide-react'
import { Panel } from '@/components/layout/Panel'
import { SegmentedTabs } from '@/components/layout/SegmentedTabs'
import { ProgressBar } from '@/components/layout/StatCard'
import { projectColor, projectStatusLabel } from '@/lib/projects/appearance'
import { cn } from '@/lib/utils'
import { deleteProjectFormAction } from '../_actions/project'
import { IssueBoard } from './board/_components/IssueBoard'
import { IssueTimeline } from './timeline/_components/IssueTimeline'
import type { BoardIssue } from './board/_components/issue-meta'
import { MemberList } from '../_components/MemberList'
import { InfoPanel } from './info/_components/InfoPanel'
import { ProjectMemoList } from '../_components/ProjectMemoList'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; subtab?: string }>
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab, subtab } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
      },
      tasks: {
        include: {
          assignees: { select: { user: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { number: 'asc' },
      },
      memos: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!project) notFound()

  const sessionUser = session.user
  const dbUser = await getCurrentDbUser()
  if (!dbUser) redirect('/api/logout')
  const currentMember = project.members.find((m) => m.userId === sessionUser.id)
  const isAdmin = dbUser.role === 'ADMIN'
  if (!currentMember && !isAdmin) notFound()

  const isOwner = project.ownerId === sessionUser.id
  const canManage = canManageProject({
    userRole: dbUser.role,
    isOwner,
    memberRole: currentMember?.role,
  })
  const canUpdateStatus = canManage || currentMember?.role === 'DEVELOPER'

  const issues: BoardIssue[] = project.tasks.map(({ assignees, ...task }) => ({
    ...task,
    assignees: assignees.map((a) => a.user),
  }))
  // 진행률은 에픽을 뺀 이슈 기준
  const workItems = issues.filter((issue) => issue.type !== 'EPIC')
  const total = workItems.length
  const done = workItems.filter((t) => t.status === 'DONE').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const epicCount = issues.length - total

  const tabs = [
    { key: 'board', label: '보드' },
    { key: 'timeline', label: '타임라인' },
    { key: 'info', label: '정보' },
    { key: 'memos', label: '메모' },
    ...(canManage ? [{ key: 'members', label: '멤버 관리' }] : []),
  ]

  const activeTab = tab && tabs.some((t) => t.key === tab) ? tab : 'board'
  const members = project.members.map((m) => m.user)
  const assignableMembers = members.filter((u) => u.isActive)
  const candidates =
    activeTab === 'members' && canManage
      ? await prisma.user.findMany({
          where: { isActive: true, projectMembers: { none: { projectId: id } } },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        })
      : []
  const dateText = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : '미정')

  return (
    <Panel className="flex-1">
      {/* 프로젝트 헤더: 아이콘, 이름, 메타, 핵심 수치, 액션 */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white',
              projectColor(project.id),
            )}
          >
            {project.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold">{project.name}</h2>
              {project.key && <span className="shrink-0 text-sm text-muted-foreground">{project.key}</span>}
              <Badge>{projectStatusLabel[project.status]}</Badge>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {project.description && (
                <span className="max-w-md truncate">{project.description}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {project.members.length}명
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {dateText(project.startDate)} ~ {dateText(project.endDate)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-40">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-semibold text-primary">
                {done}/{total} ({progress}%)
              </span>
            </div>
            <ProgressBar value={progress} className="mt-1.5" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">에픽</p>
            <p className="font-bold tabular-nums">{epicCount}</p>
          </div>
          {canManage && (
            <div className="flex gap-1.5">
              <Link
                href={`/projects/${id}/settings`}
                aria-label="프로젝트 설정"
                title="프로젝트 설정"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
              >
                <Settings />
              </Link>
              <form action={deleteProjectFormAction.bind(null, id)}>
                <Button
                  variant="destructive"
                  type="submit"
                  size="icon"
                  aria-label="프로젝트 삭제"
                  title="프로젝트 삭제"
                >
                  <Trash2 />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 좁은 화면에서는 좌측 목록 패널이 숨겨지므로 탭으로 대체 */}
      <div className="shrink-0 border-b px-4 py-2 lg:hidden">
        <SegmentedTabs
          size="sm"
          activeKey={activeTab}
          items={tabs.map((t) => ({ ...t, href: `/projects/${id}?tab=${t.key}` }))}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {activeTab === 'board' && (
          <IssueBoard
            issues={issues}
            projectId={id}
            projectKey={project.key}
            members={members}
            assignableMembers={assignableMembers}
            canManage={canManage}
            canUpdateStatus={canUpdateStatus}
          />
        )}
        {activeTab === 'timeline' && (
          <IssueTimeline
            issues={issues}
            projectId={id}
            projectKey={project.key}
            assignableMembers={assignableMembers}
            canManage={canManage}
          />
        )}
        {activeTab === 'info' && (
          <InfoPanel
            projectId={id}
            subtab={subtab ?? 'url'}
            canManage={canManage}
          />
        )}
        {activeTab === 'memos' && (
          <ProjectMemoList projectId={id} memos={project.memos} />
        )}
        {activeTab === 'members' && canManage && (
          <div className="max-w-2xl">
            <MemberList
              projectId={id}
              ownerId={project.ownerId}
              members={project.members}
              candidates={candidates}
              currentUserId={session.user.id}
              canManage={canManage}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>
    </Panel>
  )
}
