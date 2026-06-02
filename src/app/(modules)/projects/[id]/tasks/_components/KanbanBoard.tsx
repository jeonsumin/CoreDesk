'use client'

import { useMemo, useState, useTransition, useOptimistic } from 'react'
import type { ReactNode } from 'react'
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

type TaskWithAssignee = Task & { assignee: User | null }

type Props = {
  initialTasks: TaskWithAssignee[]
  projectId: string
  members: User[]
  canManageTasks?: boolean
  canUpdateTasks?: boolean
}

export function KanbanBoard({
  initialTasks,
  projectId,
  members,
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

  return (
    <div className="flex h-full min-h-[540px] flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CircleDashed className="size-4 text-primary" />
              <h2 className="text-base font-semibold">태스크 보드</h2>
              {!canUpdateTasks && <Badge variant="outline">읽기 전용</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {model.stats.completed}/{model.stats.total} 완료 · 표시{' '}
              {model.stats.visible}개
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                tone="muted"
                icon={<UserRound className="size-3.5" />}
                label="미배정"
                value={String(model.stats.unassigned)}
              />
            )}
            {canManageTasks && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button size="sm">
                      <Plus data-icon="inline-start" />
                      태스크 추가
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 태스크</DialogTitle>
                  </DialogHeader>
                  <TaskForm projectId={projectId} members={members} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(event) => updateFilter('taskQ', event.target.value)}
              placeholder="태스크명, 설명, 담당자 검색"
              className="h-8 pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.assigneeId}
              onValueChange={(value) => updateFilter('taskAssignee', value)}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 담당자</SelectItem>
                <SelectItem value="unassigned">미배정</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(value) => updateFilter('taskPriority', value)}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 우선순위</SelectItem>
                <SelectItem value="HIGH">높음</SelectItem>
                <SelectItem value="MEDIUM">보통</SelectItem>
                <SelectItem value="LOW">낮음</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.due}
              onValueChange={(value) => updateFilter('taskDue', value)}
            >
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 마감</SelectItem>
                <SelectItem value="overdue">초과</SelectItem>
                <SelectItem value="dueSoon">임박</SelectItem>
                <SelectItem value="later">여유</SelectItem>
                <SelectItem value="none">마감 없음</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <FilterX data-icon="inline-start" />
                초기화
              </Button>
            )}
          </div>
        </div>
      </div>

      {model.stats.total === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md rounded-lg border border-dashed p-8 text-center">
            <CircleDashed className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">등록된 태스크가 없습니다.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              프로젝트 실행 항목을 보드에 추가해 진행 상태를 관리하세요.
            </p>
            {canManageTasks && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button className="mt-4">
                      <Plus data-icon="inline-start" />첫 태스크 추가
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 태스크</DialogTitle>
                  </DialogHeader>
                  <TaskForm projectId={projectId} members={members} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto p-3">
          <div className="grid min-h-full min-w-[1120px] grid-cols-4 gap-3">
            {model.columns.map((column) => {
              const { status, label } = column
              const isDragOver = dragOverStatus === status

              return (
                <div
                  key={status}
                  className={cn(
                    'flex min-h-[430px] flex-col rounded-lg border border-t-4 transition-colors',
                    column.accentClassName,
                    column.softClassName,
                    isDragOver && 'ring-2 ring-primary/25 brightness-95',
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
                  <div className="flex items-start justify-between gap-2 px-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            column.textClassName,
                          )}
                        >
                          {label}
                        </span>
                        <span className="rounded-full border bg-background px-1.5 py-0.5 text-xs font-medium leading-none text-muted-foreground">
                          {column.totalCount}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {column.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {column.overdueCount > 0 && (
                        <Badge className="border-red-200 bg-red-50 text-red-700">
                          {column.overdueCount}
                        </Badge>
                      )}
                      {column.highPriorityCount > 0 && (
                        <Badge className="border-zinc-200 bg-background text-zinc-700">
                          높음 {column.highPriorityCount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                    {column.tasks.length === 0 ? (
                      <div className="flex h-28 items-center justify-center rounded-lg border border-dashed bg-background/60 px-3 text-center text-xs text-muted-foreground">
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
                          members={members}
                          canManageTasks={canManageTasks}
                          canDrag={canUpdateTasks}
                          onDragStart={setDraggedId}
                        />
                      ))
                    )}
                  </div>

                  {canManageTasks && (
                    <div className="border-t bg-background/40 p-2">
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-full justify-start gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
                            >
                              <Plus size={14} />
                              태스크 추가
                            </Button>
                          }
                        />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>새 태스크</DialogTitle>
                          </DialogHeader>
                          <TaskForm
                            projectId={projectId}
                            members={members}
                            defaultStatus={status}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
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
  tone?: 'default' | 'danger' | 'warning' | 'muted'
}) {
  return (
    <div
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-700',
        tone === 'warning' && 'border-orange-200 bg-orange-50 text-orange-700',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
