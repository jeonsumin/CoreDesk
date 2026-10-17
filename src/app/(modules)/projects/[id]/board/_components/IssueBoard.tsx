'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MoreHorizontal, Plus, Search, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CountBadge } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import { formatIssueKey } from '@/lib/projects/issue-key'
import { buildKanbanBoardModel, type KanbanStatus } from '@/lib/projects/kanban-board'
import type { IssueType } from '@/types'
import { updateIssueStatus } from '../_actions/issue'
import { IssueCard } from './IssueCard'
import { IssueDetailDialog } from './IssueDetailDialog'
import { IssueForm } from './IssueForm'
import { statusMeta, type BoardIssue, type MemberOption } from './issue-meta'

type Props = {
  issues: BoardIssue[]
  projectId: string
  projectKey: string | null
  members: MemberOption[]
  // 새 이슈·담당자 변경에는 활성 멤버만 고를 수 있다
  assignableMembers: MemberOption[]
  canManage: boolean
  canUpdateStatus: boolean
}

type NewIssueDefaults = { type: IssueType; status?: KanbanStatus; epicId?: string }

const columnTone: Record<KanbanStatus, string> = {
  TODO: 'bg-muted/60',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-950/30',
  DONE: 'bg-green-50 dark:bg-green-950/30',
}

export function IssueBoard({
  issues,
  projectId,
  projectKey,
  members,
  assignableMembers,
  canManage,
  canUpdateStatus,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<KanbanStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newIssue, setNewIssue] = useState<NewIssueDefaults | null>(null)
  const [, startTransition] = useTransition()

  const filters = useMemo(
    () => ({
      query: searchParams.get('boardQ') ?? '',
      epic: searchParams.get('epic') ?? 'all',
      assigneeId: searchParams.get('boardAssignee') ?? 'all',
    }),
    [searchParams],
  )

  const [optimisticIssues, setOptimisticStatus] = useOptimistic(
    issues,
    (state, { id, status }: { id: string; status: KanbanStatus }) =>
      state.map((issue) => (issue.id === id ? { ...issue, status } : issue)),
  )
  const model = useMemo(() => buildKanbanBoardModel(optimisticIssues, { filters }), [optimisticIssues, filters])

  const epics = issues.filter((issue) => issue.type === 'EPIC')
  const epicById = new Map(epics.map((epic) => [epic.id, epic]))
  const keyOf = (issue: Pick<BoardIssue, 'number'>) => formatIssueKey(projectKey, issue.number)
  const epicOptions = epics.map((epic) => ({ id: epic.id, label: [keyOf(epic), epic.title].filter(Boolean).join(' ') }))
  // 서버 재렌더 후에도 최신 값을 보여주도록 id 로 다시 찾는다
  const selectedIssue = issues.find((issue) => issue.id === selectedId) ?? null
  const selectedEpic = filters.epic !== 'all' && filters.epic !== 'none' ? filters.epic : undefined

  const updateParam = (key: 'boardQ' | 'epic' | 'boardAssignee', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all') params.delete(key)
    else params.set(key, value)
    params.set('tab', 'board')
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleDrop = (status: KanbanStatus) => {
    const id = draggedId
    setDraggedId(null)
    setDragOverStatus(null)
    const issue = optimisticIssues.find((i) => i.id === id)
    if (!canUpdateStatus || !id || !issue || issue.status === status) return

    startTransition(async () => {
      setOptimisticStatus({ id, status })
      await updateIssueStatus(id, projectId, status)
    })
  }

  const epicFilterItems = [
    { value: 'all', label: '모든 에픽' },
    { value: 'none', label: '에픽 미할당' },
    ...epicOptions.map((e) => ({ value: e.id, label: e.label })),
  ]
  const assigneeItems = [
    { value: 'all', label: '전체 담당자' },
    { value: 'unassigned', label: '미배정' },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ]

  return (
    <div className="flex h-full min-h-[540px] flex-col gap-3">
      {/* 툴바: 이슈 추가 / 검색 / 담당자 / 에픽 필터 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canManage && (
          <Button size="icon" aria-label="이슈 만들기" title="이슈 만들기" onClick={() => setNewIssue({ type: 'TASK', epicId: selectedEpic })}>
            <Plus />
          </Button>
        )}
        <div className="relative w-full min-w-48 sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => updateParam('boardQ', e.target.value)}
            placeholder="제목, 설명, 담당자 검색"
            className="h-8 pl-9 text-sm"
          />
        </div>
        <FilterSelect items={assigneeItems} value={filters.assigneeId} onChange={(v) => updateParam('boardAssignee', v)} className="w-36" />
        <div className="ml-auto flex items-center gap-2">
          {!canUpdateStatus && <Badge variant="outline">읽기 전용</Badge>}
          <FilterSelect items={epicFilterItems} value={filters.epic} onChange={(v) => updateParam('epic', v)} className="w-48" icon />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto">
        {/* 에픽 패널 */}
        <aside className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto border-r pr-3">
          <div className="flex items-center justify-between px-1 py-1 text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <Zap className="size-4 text-purple-500" />
              에픽
              <CountBadge>{epics.length}</CountBadge>
            </span>
            {canManage && (
              <Button variant="ghost" size="icon-xs" aria-label="에픽 만들기" title="에픽 만들기" onClick={() => setNewIssue({ type: 'EPIC' })}>
                <Plus />
              </Button>
            )}
          </div>
          <EpicFilterRow label="모든 이슈" count={model.stats.total} active={filters.epic === 'all'} onClick={() => updateParam('epic', 'all')} />
          <EpicFilterRow label="에픽 미할당" count={model.stats.withoutEpic} active={filters.epic === 'none'} onClick={() => updateParam('epic', 'none')} />

          {model.epics.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              <p>에픽으로 이슈를 묶어 관리하세요.</p>
              {canManage && (
                <Button variant="link" size="sm" onClick={() => setNewIssue({ type: 'EPIC' })}>
                  첫 에픽 만들기
                </Button>
              )}
            </div>
          ) : (
            model.epics.map((epic) => (
              <div
                key={epic.id}
                className={cn(
                  'relative rounded-lg border bg-card p-3 text-sm transition-colors hover:border-purple-300',
                  filters.epic === epic.id && 'border-purple-400 ring-1 ring-purple-300',
                )}
              >
                <button
                  type="button"
                  onClick={() => updateParam('epic', filters.epic === epic.id ? 'all' : epic.id)}
                  className="block w-full space-y-1.5 text-left after:absolute after:inset-0"
                >
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="size-3.5 text-purple-500" />
                    {keyOf(epic)}
                  </span>
                  <span className="block truncate font-medium">{epic.title}</span>
                  <span className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {epic.done} / {epic.total} 완료
                    </span>
                    <span className="tabular-nums">{epic.progress}%</span>
                  </span>
                  <span className="block h-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-purple-500" style={{ width: `${epic.progress}%` }} />
                  </span>
                  <span className="flex justify-between text-xs">
                    <span className={cn('rounded px-1.5', statusMeta[epic.status].className)}>{statusMeta[epic.status].label}</span>
                    <span className="truncate text-muted-foreground">{epic.assignees.map((a) => a.name).join(', ')}</span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${epic.title} 상세`}
                  title="상세"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => setSelectedId(epic.id)}
                >
                  <MoreHorizontal />
                </Button>
              </div>
            ))
          )}
        </aside>

        {/* 상태 컬럼 */}
        <div className="grid min-w-[720px] flex-1 grid-cols-3 gap-3">
          {model.columns.map((column) => (
            <div
              key={column.status}
              className={cn(
                'flex min-h-0 flex-col rounded-xl transition-colors',
                columnTone[column.status],
                dragOverStatus === column.status && 'ring-2 ring-primary/30',
              )}
              onDragOver={(e) => {
                if (!canUpdateStatus) return
                e.preventDefault()
                setDragOverStatus(column.status)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null)
              }}
              onDrop={() => handleDrop(column.status)}
            >
              <div className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-semibold">
                {column.label}
                <CountBadge>{column.totalCount}</CountBadge>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {column.tasks.map((issue) => {
                  const epic = issue.epicId ? epicById.get(issue.epicId) : undefined
                  return (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      issueKey={keyOf(issue)}
                      epic={epic && { issueKey: keyOf(epic), title: epic.title }}
                      canDrag={canUpdateStatus}
                      onDragStart={setDraggedId}
                      onOpen={setSelectedId}
                    />
                  )
                })}
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setNewIssue({ type: 'TASK', status: column.status, epicId: selectedEpic })}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="size-4" />
                    이슈 만들기
                  </button>
                ) : (
                  column.tasks.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">{column.label} 이슈 없음</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={newIssue !== null} onOpenChange={(open) => !open && setNewIssue(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{newIssue?.type === 'EPIC' ? '에픽 만들기' : '이슈 만들기'}</DialogTitle>
          </DialogHeader>
          {newIssue && (
            <IssueForm
              projectId={projectId}
              defaultType={newIssue.type}
              defaultStatus={newIssue.status}
              defaultEpicId={newIssue.epicId}
              members={assignableMembers}
              epics={epicOptions}
              onSuccess={() => setNewIssue(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <IssueDetailDialog
        projectId={projectId}
        projectKey={projectKey}
        issue={selectedIssue}
        epics={epics}
        members={assignableMembers}
        canManage={canManage}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}

function EpicFilterRow({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/40',
        active && 'border-primary/50 bg-primary/5 font-semibold',
      )}
    >
      {label}
      <CountBadge>{count}</CountBadge>
    </button>
  )
}

function FilterSelect({
  items,
  value,
  onChange,
  className,
  icon,
}: {
  items: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
  icon?: boolean
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(String(v ?? 'all'))}>
      <SelectTrigger size="sm" className={cn('text-xs', className)}>
        {icon && <Zap className="size-3.5 text-purple-500" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
