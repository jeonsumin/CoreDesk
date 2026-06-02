'use client'

import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Flag,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  buildMilestoneGanttModel,
  formatGanttDate,
  toDateInputValue,
  type MilestoneGanttRow,
  type MilestoneGanttStatus,
} from '@/lib/projects/milestone-gantt'
import { deleteMilestone, toggleMilestone } from '../_actions/milestone'
import { MilestoneForm } from './MilestoneForm'
import type { Milestone } from '@/types'

const DAY_WIDTH = 34
const ROW_HEIGHT = 58
const HEADER_HEIGHT = 86
const LEFT_WIDTH = 430

const statusLabel: Record<MilestoneGanttStatus, string> = {
  completed: '완료',
  overdue: '지연',
  dueSoon: '임박',
  inProgress: '진행',
  scheduled: '예정',
}

const statusStyle: Record<
  MilestoneGanttStatus,
  {
    bar: string
    badge: string
    dot: string
    text: string
  }
> = {
  completed: {
    bar: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  overdue: {
    bar: 'bg-red-500',
    badge: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
  dueSoon: {
    bar: 'bg-orange-500',
    badge: 'border-orange-200 bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
  },
  inProgress: {
    bar: 'bg-primary',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-primary',
    text: 'text-blue-700',
  },
  scheduled: {
    bar: 'bg-zinc-500',
    badge: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    dot: 'bg-zinc-400',
    text: 'text-zinc-600',
  },
}

type OptimisticAction =
  | { type: 'toggle'; id: string; completed: boolean }
  | { type: 'delete'; id: string }

type Props = {
  initialMilestones: Milestone[]
  projectId: string
  canManage?: boolean
}

export function WbsTimeline({
  initialMilestones,
  projectId,
  canManage = true,
}: Props) {
  const [, startTransition] = useTransition()
  const [optimistic, applyOptimistic] = useOptimistic(
    initialMilestones,
    (state: Milestone[], action: OptimisticAction) => {
      if (action.type === 'toggle') {
        return state.map((milestone) =>
          milestone.id === action.id
            ? { ...milestone, isCompleted: action.completed }
            : milestone,
        )
      }

      return state.filter((milestone) => milestone.id !== action.id)
    },
  )

  const model = useMemo(
    () => buildMilestoneGanttModel(optimistic, { minDays: 35 }),
    [optimistic],
  )
  const timelineWidth = model.days.length * DAY_WIDTH
  const totalWidth = LEFT_WIDTH + timelineWidth

  const [createOpen, setCreateOpen] = useState(false)
  const [defaultDate, setDefaultDate] = useState('')
  const [defaultStartDate, setDefaultStartDate] = useState('')
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragCurrent, setDragCurrent] = useState<number | null>(null)

  const isDragging = dragStart !== null && dragCurrent !== null
  const dragMin = isDragging ? Math.min(dragStart, dragCurrent) : null
  const dragMax = isDragging ? Math.max(dragStart, dragCurrent) : null

  useEffect(() => {
    const cancelDrag = () => {
      setDragStart(null)
      setDragCurrent(null)
    }

    window.addEventListener('mouseup', cancelDrag)
    return () => window.removeEventListener('mouseup', cancelDrag)
  }, [])

  const openCreateDialog = (startIndex?: number, endIndex?: number) => {
    const startDate =
      startIndex === undefined ? '' : toDateInputValue(model.days[startIndex]?.date)
    const dueDate =
      endIndex === undefined ? '' : toDateInputValue(model.days[endIndex]?.date)

    setDefaultStartDate(startDate)
    setDefaultDate(dueDate)
    setCreateOpen(true)
  }

  const handleToggle = (milestone: Milestone) => {
    if (!canManage) return

    startTransition(async () => {
      applyOptimistic({
        type: 'toggle',
        id: milestone.id,
        completed: !milestone.isCompleted,
      })
      await toggleMilestone(milestone.id, projectId, !milestone.isCompleted)
    })
  }

  const handleDelete = (id: string) => {
    if (!canManage) return

    startTransition(async () => {
      applyOptimistic({ type: 'delete', id })
      await deleteMilestone(id, projectId)
    })
  }

  const createCellProps = (index: number) => ({
    onMouseDown: (event: MouseEvent) => {
      if (!canManage) return
      event.preventDefault()
      setDragStart(index)
      setDragCurrent(index)
    },
    onMouseMove: () => {
      if (dragStart !== null) setDragCurrent(index)
    },
    onMouseUp: () => {
      if (dragMin !== null && dragMax !== null) {
        openCreateDialog(dragMin, dragMax)
      }
      setDragStart(null)
      setDragCurrent(null)
    },
  })

  const findMilestone = (id: string) =>
    optimistic.find((milestone) => milestone.id === id) ?? null

  return (
    <div className="isolate flex h-full min-h-[520px] flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-base font-semibold">마일스톤 간트</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {model.stats.completed}/{model.stats.total} 완료
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {model.stats.overdue > 0 && (
            <Badge className="border-red-200 bg-red-50 text-red-700">
              <AlertTriangle className="size-3" />
              지연 {model.stats.overdue}
            </Badge>
          )}
          {model.stats.dueSoon > 0 && (
            <Badge className="border-orange-200 bg-orange-50 text-orange-700">
              <Clock3 className="size-3" />
              임박 {model.stats.dueSoon}
            </Badge>
          )}
          {canManage && (
            <Button size="sm" onClick={() => openCreateDialog()}>
              <Plus data-icon="inline-start" />
              추가
            </Button>
          )}
        </div>
      </div>

      {model.rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md rounded-lg border border-dashed p-8 text-center">
            <Flag className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">등록된 마일스톤이 없습니다.</p>
            {canManage && (
              <Button className="mt-4" onClick={() => openCreateDialog()}>
                <Plus data-icon="inline-start" />
                첫 마일스톤 추가
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="relative" style={{ width: totalWidth }}>
            <TimelineHeader model={model} timelineWidth={timelineWidth} />

            {model.todayIndex >= 0 && model.todayIndex < model.days.length && (
              <div
                className="absolute bottom-0 top-0 z-20 pointer-events-none"
                style={{
                  left: LEFT_WIDTH + model.todayIndex * DAY_WIDTH + DAY_WIDTH / 2,
                }}
              >
                <div className="h-full w-px bg-primary/70" />
                <div
                  className="absolute -left-[5px] size-2.5 rounded-full bg-primary"
                  style={{ top: HEADER_HEIGHT - 5 }}
                />
              </div>
            )}

            {model.rows.map((row, index) => (
              <div
                key={row.id}
                className={cn(
                  'flex border-b transition-colors hover:bg-muted/20',
                  row.status === 'completed' && 'text-muted-foreground',
                )}
                style={{ height: ROW_HEIGHT }}
              >
                <MilestoneLeftCell
                  canManage={canManage}
                  index={index}
                  milestone={findMilestone(row.id)}
                  row={row}
                  onDelete={handleDelete}
                  onEdit={(milestone) => setEditMilestone(milestone)}
                  onToggle={handleToggle}
                />
                <TimelineTrack row={row} model={model} />
              </div>
            ))}

            {canManage && (
              <div className="flex border-b bg-muted/10" style={{ height: ROW_HEIGHT }}>
                <button
                  type="button"
                  className="sticky left-0 z-40 flex items-center gap-2 border-r bg-background px-4 text-left text-sm text-muted-foreground shadow-[6px_0_18px_-16px_rgba(23,23,25,0.7)] transition-colors hover:bg-muted/30"
                  style={{ width: LEFT_WIDTH }}
                  onClick={() => openCreateDialog()}
                  title="마일스톤 추가"
                >
                  <span className="flex size-7 items-center justify-center rounded-full border border-dashed">
                    <Plus className="size-3.5" />
                  </span>
                  새 마일스톤
                </button>
                <div
                  className="relative"
                  style={{ width: timelineWidth, height: ROW_HEIGHT }}
                >
                  <TimelineGrid
                    model={model}
                    selectedStartIndex={dragMin}
                    selectedEndIndex={dragMax}
                  />
                  <div className="absolute inset-0 flex">
                    {model.days.map((day, index) => (
                      <div
                        key={day.date.toISOString()}
                        className="shrink-0 cursor-crosshair"
                        style={{ width: DAY_WIDTH }}
                        {...createCellProps(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 마일스톤</DialogTitle>
          </DialogHeader>
          <MilestoneForm
            projectId={projectId}
            defaultDate={defaultDate}
            defaultStartDate={defaultStartDate}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editMilestone}
        onOpenChange={(open) => !open && setEditMilestone(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>마일스톤 수정</DialogTitle>
          </DialogHeader>
          {editMilestone && (
            <MilestoneForm
              projectId={projectId}
              milestone={editMilestone}
              onSuccess={() => setEditMilestone(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TimelineHeader({
  model,
  timelineWidth,
}: {
  model: ReturnType<typeof buildMilestoneGanttModel>
  timelineWidth: number
}) {
  return (
    <div
      className="sticky top-0 z-30 flex border-b bg-background"
      style={{ height: HEADER_HEIGHT }}
    >
      <div
        className="sticky left-0 z-50 grid shrink-0 grid-cols-[52px_1fr_74px_76px] items-end gap-2 border-r bg-background px-4 pb-2 text-[11px] font-medium text-muted-foreground shadow-[6px_0_18px_-16px_rgba(23,23,25,0.7)]"
        style={{ width: LEFT_WIDTH, height: HEADER_HEIGHT }}
      >
        <span>WBS</span>
        <span>마일스톤</span>
        <span>기간</span>
        <span>D-Day</span>
      </div>
      <div className="flex flex-col" style={{ width: timelineWidth }}>
        <div className="flex border-b" style={{ height: 26 }}>
          {model.monthGroups.map((group) => (
            <div
              key={`${group.label}-${group.startIndex}`}
              className="flex shrink-0 items-center border-r bg-muted/20 px-2 text-[11px] font-semibold text-muted-foreground"
              style={{ width: group.span * DAY_WIDTH }}
            >
              {group.label}
            </div>
          ))}
        </div>
        <div className="flex border-b" style={{ height: 28 }}>
          {model.weekGroups.map((group) => (
            <div
              key={`${group.label}-${group.startIndex}`}
              className="flex shrink-0 items-center border-r px-2 text-[10px] font-medium text-muted-foreground"
              style={{ width: group.span * DAY_WIDTH }}
            >
              {group.label}
            </div>
          ))}
        </div>
        <div className="flex flex-1">
          {model.days.map((day, index) => {
            const isToday = index === model.todayIndex

            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  'flex shrink-0 flex-col items-center justify-center border-r text-[10px]',
                  day.isWeekend && 'bg-muted/30',
                  isToday && 'bg-primary/10 text-primary',
                )}
                style={{ width: DAY_WIDTH }}
              >
                <span className="font-semibold leading-none">{day.dayOfMonth}</span>
                <span className="mt-1 leading-none text-muted-foreground">
                  {day.dayOfWeek}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MilestoneLeftCell({
  canManage,
  index,
  milestone,
  row,
  onDelete,
  onEdit,
  onToggle,
}: {
  canManage: boolean
  index: number
  milestone: Milestone | null
  row: MilestoneGanttRow
  onDelete: (id: string) => void
  onEdit: (milestone: Milestone) => void
  onToggle: (milestone: Milestone) => void
}) {
  const style = statusStyle[row.status]
  const dateRange = row.isPoint
    ? formatGanttDate(row.dueDate)
    : `${formatGanttDate(row.startDate)} - ${formatGanttDate(row.dueDate)}`

  return (
    <div
      className="group sticky left-0 z-40 grid shrink-0 grid-cols-[52px_1fr_74px_76px] items-center gap-2 border-r bg-background px-4 shadow-[6px_0_18px_-16px_rgba(23,23,25,0.7)]"
      style={{ width: LEFT_WIDTH, height: ROW_HEIGHT }}
    >
      <span className="rounded-full bg-muted px-2 py-0.5 text-center text-[11px] font-medium text-muted-foreground">
        M-{String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        {canManage && milestone ? (
          <button
            type="button"
            onClick={() => onToggle(milestone)}
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              row.status === 'completed'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-muted-foreground/30 hover:border-primary',
            )}
            title="완료 상태 변경"
          >
            {row.status === 'completed' && <Check className="size-3" />}
          </button>
        ) : (
          <span className={cn('size-2.5 shrink-0 rounded-full', style.dot)} />
        )}
        <div className="min-w-0">
          <p
            className={cn(
              'truncate text-sm font-medium leading-tight',
              row.status === 'completed' && 'line-through text-muted-foreground',
            )}
          >
            {row.title}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn('size-1.5 rounded-full', style.dot)} />
            <span className={cn('text-[11px] font-medium', style.text)}>
              {statusLabel[row.status]}
            </span>
          </div>
        </div>
      </div>
      <span className="truncate text-xs text-muted-foreground" title={dateRange}>
        {row.durationLabel}
      </span>
      <div className="flex items-center justify-between gap-1">
        <Badge className={cn('border text-[11px]', style.badge)}>{row.dDayLabel}</Badge>
        {canManage && milestone && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(milestone)}
              title="마일스톤 수정"
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(row.id)}
              title="마일스톤 삭제"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineTrack({
  model,
  row,
}: {
  model: ReturnType<typeof buildMilestoneGanttModel>
  row: MilestoneGanttRow
}) {
  return (
    <div className="relative" style={{ width: model.days.length * DAY_WIDTH }}>
      <TimelineGrid model={model} />
      <GanttBar row={row} />
    </div>
  )
}

function TimelineGrid({
  model,
  selectedStartIndex,
  selectedEndIndex,
}: {
  model: ReturnType<typeof buildMilestoneGanttModel>
  selectedStartIndex?: number | null
  selectedEndIndex?: number | null
}) {
  return (
    <div className="absolute inset-0 flex">
      {model.days.map((day, index) => {
        const isSelected =
          selectedStartIndex !== null &&
          selectedStartIndex !== undefined &&
          selectedEndIndex !== null &&
          selectedEndIndex !== undefined &&
          index >= selectedStartIndex &&
          index <= selectedEndIndex
        const isToday = index === model.todayIndex

        return (
          <div
            key={day.date.toISOString()}
            className={cn(
              'h-full shrink-0 border-r',
              day.isWeekend && 'bg-muted/20',
              isToday && 'bg-primary/5',
              isSelected && 'bg-primary/15',
            )}
            style={{ width: DAY_WIDTH }}
          />
        )
      })}
    </div>
  )
}

function GanttBar({ row }: { row: MilestoneGanttRow }) {
  const style = statusStyle[row.status]
  const milestoneTitle = `${row.title} · ${formatGanttDate(row.startDate)} - ${formatGanttDate(row.dueDate)}`
  const diamondLeft = row.endIndex * DAY_WIDTH + DAY_WIDTH / 2 - 6

  if (row.isPoint) {
    return (
      <div
        className={cn(
          'absolute top-1/2 z-10 size-3 -translate-y-1/2 rotate-45 rounded-[2px] shadow-sm ring-2 ring-background',
          style.bar,
        )}
        style={{ left: diamondLeft }}
        title={milestoneTitle}
      />
    )
  }

  const left = row.startIndex * DAY_WIDTH + 5
  const width = Math.max(row.spanDays * DAY_WIDTH - 10, 18)

  return (
    <>
      <div
        className={cn(
          'absolute top-1/2 z-10 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-sm px-2 text-[11px] font-medium text-white shadow-sm',
          style.bar,
          row.status === 'completed' && 'opacity-80',
        )}
        style={{ left, width }}
        title={milestoneTitle}
      >
        {row.spanDays >= 3 && <span className="truncate">{row.title}</span>}
      </div>
      <div
        className={cn(
          'absolute top-1/2 z-20 size-3 -translate-y-1/2 rotate-45 rounded-[2px] shadow-sm ring-2 ring-background',
          style.bar,
        )}
        style={{ left: diamondLeft }}
        title={row.dDayLabel}
      />
    </>
  )
}
