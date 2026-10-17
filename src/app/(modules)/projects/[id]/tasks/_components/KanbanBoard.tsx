'use client'

import { useMemo, useState, useTransition, useOptimistic } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FilterX,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CountBadge, EmptyState } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import {
  buildKanbanBoardModel,
  type KanbanAssigneeFilter,
  type KanbanDueFilter,
  type KanbanPriorityFilter,
  type KanbanStatus,
} from '@/lib/projects/kanban-board'
import { KanbanCard } from './KanbanCard'
import { TaskForm } from './TaskForm'
import { updateTaskStatus } from '../_actions/task'
import type { Task, User } from '@/types'

type TaskWithAssignee = Task & {
  assignee: Pick<User, 'id' | 'name' | 'email'> | null
}

type Props = {
  initialTasks: TaskWithAssignee[]
  projectId: string
  members: Pick<User, 'id' | 'name'>[]
  // 새 태스크·담당자 변경에는 활성 멤버만 고를 수 있다
  assignableMembers: Pick<User, 'id' | 'name'>[]
  canManageTasks?: boolean
  canUpdateTasks?: boolean
}

export function KanbanBoard({
  initialTasks,
  projectId,
  members,
  assignableMembers,
  canManageTasks = true,
  canUpdateTasks = true,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<KanbanStatus | null>(null)
  const [, startTransition] = useTransition()
  const today = useMemo(() => new Date(), [])

  const filters = useMemo(
    () => ({
      query: searchParams.get('taskQ') ?? '',
      assigneeId: (searchParams.get('taskAssignee') ??
        'all') as KanbanAssigneeFilter,
      priority: (searchParams.get('taskPriority') ??
        'all') as KanbanPriorityFilter,
      due: (searchParams.get('taskDue') ?? 'all') as KanbanDueFilter,
    }),
    [searchParams],
  )

  const [optimisticTasks, addOptimistic] = useOptimistic(
    initialTasks,
    (
      state,
      { taskId, newStatus }: { taskId: string; newStatus: KanbanStatus },
    ) => state.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
  )

  const model = useMemo(
    () => buildKanbanBoardModel(optimisticTasks, { today, filters }),
    [filters, optimisticTasks, today],
  )

  const hasFilters =
    filters.query.trim() !== '' ||
    filters.assigneeId !== 'all' ||
    filters.priority !== 'all' ||
    filters.due !== 'all'

  const updateFilter = (
    key: 'taskQ' | 'taskAssignee' | 'taskPriority' | 'taskDue',
    value: string | null,
  ) => {
    const params = new URLSearchParams(searchParams.toString())
    const isEmpty = !value || value === 'all'

    if (isEmpty) params.delete(key)
    else params.set(key, value)

    params.set('tab', 'tasks')

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('taskQ')
    params.delete('taskAssignee')
    params.delete('taskPriority')
    params.delete('taskDue')
    params.set('tab', 'tasks')

    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleDrop = (targetStatus: KanbanStatus) => {
    const id = draggedId
    setDraggedId(null)
    setDragOverStatus(null)
    if (!canUpdateTasks || !id) return

    const task = optimisticTasks.find((t) => t.id === id)
    if (!task || task.status === targetStatus) return

    startTransition(async () => {
      addOptimistic({ taskId: id, newStatus: targetStatus })
      await updateTaskStatus(id, projectId, targetStatus)
    })
  }

  const assigneeItems = [
    { value: 'all', label: '전체 담당자' },
    { value: 'unassigned', label: '미배정' },
    ...members.map((member) => ({ value: member.id, label: member.name })),
  ]

  return (
    <div className="flex h-full min-h-[540px] flex-col gap-4">
      {/* 툴바: 추가 / 검색 / 필터 / 요약 수치 (패널 안이므로 테두리 없음) */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canManageTasks && (
          <NewTaskDialog
            projectId={projectId}
            members={assignableMembers}
            trigger={
              <Button size="icon" aria-label="태스크 추가" title="태스크 추가">
                <Plus />
              </Button>
            }
          />
        )}

        <div className="relative w-full min-w-48 sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) => updateFilter('taskQ', event.target.value)}
            placeholder="태스크명, 설명, 담당자 검색"
            className="h-8 pl-9 text-sm"
          />
        </div>

        <Select
          items={assigneeItems}
          value={filters.assigneeId}
          onValueChange={(value) => updateFilter('taskAssignee', value)}
        >
          <SelectTrigger size="sm" className="w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assigneeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={priorityFilterItems}
          value={filters.priority}
          onValueChange={(value) => updateFilter('taskPriority', value)}
        >
          <SelectTrigger size="sm" className="w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityFilterItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={dueFilterItems}
          value={filters.due}
          onValueChange={(value) => updateFilter('taskDue', value)}
        >
          <SelectTrigger size="sm" className="w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dueFilterItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX data-icon="inline-start" />
            초기화
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {!canUpdateTasks && <Badge variant="outline">읽기 전용</Badge>}
          <span className="text-xs text-muted-foreground tabular-nums">
            {model.stats.completed}/{model.stats.total} 완료 · 표시 {model.stats.visible}개
          </span>
          <BoardMetric
            icon={<CheckCircle2 className="size-3.5" />}
            label="진행률"
            value={`${model.stats.progress}%`}
          />
          {model.stats.overdue > 0 && (
            <BoardMetric
              tone="danger"
              icon={<AlertTriangle className="size-3.5" />}
              label="초과"
              value={String(model.stats.overdue)}
            />
          )}
          {model.stats.dueSoon > 0 && (
            <BoardMetric
              tone="warning"
              icon={<Clock3 className="size-3.5" />}
              label="임박"
              value={String(model.stats.dueSoon)}
            />
          )}
          {model.stats.unassigned > 0 && (
            <BoardMetric
              icon={<UserRound className="size-3.5" />}
              label="미배정"
              value={String(model.stats.unassigned)}
            />
          )}
        </div>
      </div>

      {model.stats.total === 0 ? (
        <EmptyState
          className="flex-1"
          icon={<CircleDashed />}
          title="등록된 태스크가 없습니다."
          description="프로젝트 실행 항목을 보드에 추가해 진행 상태를 관리하세요."
          action={
            canManageTasks && (
              <NewTaskDialog
                projectId={projectId}
                members={assignableMembers}
                trigger={
                  <Button>
                    <Plus data-icon="inline-start" />첫 태스크 추가
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="grid min-h-full min-w-[1120px] grid-cols-4 gap-4">
            {model.columns.map((column) => {
              const { status, label } = column
              const isDragOver = dragOverStatus === status

              return (
                <div
                  key={status}
                  className={cn(
                    'flex min-h-[430px] flex-col rounded-xl bg-muted/50 transition-colors',
                    isDragOver && 'bg-primary/5 ring-2 ring-primary/25',
                  )}
                  onDragOver={(event) => {
                    if (!canUpdateTasks) return
                    event.preventDefault()
                    setDragOverStatus(status)
                  }}
                  onDragLeave={(event) => {
                    if (!canUpdateTasks) return
                    if (
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    ) {
                      setDragOverStatus(null)
                    }
                  }}
                  onDrop={() => handleDrop(status)}
                >
                  <div
                    className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5"
                    title={column.description}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn('size-2 shrink-0 rounded-full', column.dotClassName)}
                      />
                      <span className="text-sm font-semibold">{label}</span>
                      <CountBadge>{column.totalCount}</CountBadge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {column.overdueCount > 0 && (
                        <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                          초과 {column.overdueCount}
                        </span>
                      )}
                      {column.highPriorityCount > 0 && (
                        <span className="rounded-md border bg-card px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          높음 {column.highPriorityCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                    {column.tasks.length === 0 ? (
                      <div className="flex h-24 items-center justify-center px-3 text-center text-xs text-muted-foreground">
                        {hasFilters
                          ? '조건에 맞는 태스크가 없습니다.'
                          : `${label} 태스크 없음`}
                      </div>
                    ) : (
                      column.tasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          projectId={projectId}
                          members={assignableMembers}
                          canManageTasks={canManageTasks}
                          canDrag={canUpdateTasks}
                          onDragStart={setDraggedId}
                        />
                      ))
                    )}

                    {canManageTasks && (
                      <NewTaskDialog
                        projectId={projectId}
                        members={assignableMembers}
                        defaultStatus={status}
                        trigger={
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            <Plus className="size-4" />
                            태스크 추가
                          </button>
                        }
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const priorityFilterItems = [
  { value: 'all', label: '전체 우선순위' },
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
]

const dueFilterItems = [
  { value: 'all', label: '전체 마감' },
  { value: 'overdue', label: '초과' },
  { value: 'dueSoon', label: '임박' },
  { value: 'later', label: '여유' },
  { value: 'none', label: '마감 없음' },
]

function NewTaskDialog({
  projectId,
  members,
  defaultStatus,
  trigger,
}: {
  projectId: string
  members: Pick<User, 'id' | 'name'>[]
  defaultStatus?: KanbanStatus
  trigger: ReactElement
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 태스크</DialogTitle>
        </DialogHeader>
        <TaskForm
          projectId={projectId}
          members={members}
          defaultStatus={defaultStatus}
        />
      </DialogContent>
    </Dialog>
  )
}

function BoardMetric({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode
  label: string
  value: string
  tone?: 'default' | 'danger' | 'warning'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        tone === 'default' && 'text-muted-foreground',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-600',
        tone === 'warning' && 'border-orange-200 bg-orange-50 text-orange-600',
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  )
}
