'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react'
import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  Clock3,
  Flag,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CountBadge, EmptyState } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import {
  buildMilestoneGanttModel,
  formatGanttDate,
  getWeekOfMonth,
  toDateInputValue,
  type MilestoneGanttModel,
  type MilestoneGanttRow,
  type MilestoneGanttStatus,
} from '@/lib/projects/milestone-gantt'
import { deleteMilestone, toggleMilestone } from '../_actions/milestone'
import { MilestoneForm } from './MilestoneForm'
import type { Milestone } from '@/types'

// 시안 timeline.html: 좌측 목록 + 우측 월/주/일 그리드, 툴바에서 확대·축소
const LEFT_WIDTH = 380
const ROW_HEIGHT = 40
// 줌과 무관하게 헤더 높이를 고정하고, 보이는 눈금 줄(월/주/일)이 높이를 나눠 갖는다
const HEADER_HEIGHT = 84

type Zoom = 'day' | 'week' | 'month'
const ZOOMS: Zoom[] = ['month', 'week', 'day']
const DAY_WIDTH: Record<Zoom, number> = { day: 40, week: 14, month: 5 }
const SCALE_LABELS: { key: Zoom; label: string }[] = [
  { key: 'month', label: '월' },
  { key: 'week', label: '주' },
  { key: 'day', label: '일' },
]

type Filter = 'all' | 'open' | 'completed'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'open', label: '진행 중' },
  { key: 'completed', label: '완료' },
]

const statusLabel: Record<MilestoneGanttStatus, string> = {
  completed: '완료',
  overdue: '지연',
  dueSoon: '임박',
  inProgress: '진행',
  scheduled: '예정',
}

const statusStyle: Record<MilestoneGanttStatus, { bar: string; pill: string }> = {
  completed: { bar: 'bg-green-500 text-white', pill: 'bg-green-100 text-green-700' },
  overdue: { bar: 'bg-red-500 text-white', pill: 'bg-red-100 text-red-600' },
  dueSoon: { bar: 'bg-orange-500 text-white', pill: 'bg-orange-100 text-orange-600' },
  inProgress: { bar: 'bg-blue-500 text-white', pill: 'bg-blue-100 text-blue-700' },
  scheduled: { bar: 'bg-primary/15 text-primary', pill: 'bg-muted text-muted-foreground' },
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
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
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

  const [zoom, setZoom] = useState<Zoom>('day')
  const [filter, setFilter] = useState<Filter>('all')
  const dayWidth = DAY_WIDTH[zoom]

  const model = useMemo(
    () => buildMilestoneGanttModel(optimistic, { minDays: 35 }),
    [optimistic],
  )
  // M-01 번호는 필터와 무관하게 전체 순서를 유지한다
  const rows = model.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      filter === 'all'
        ? true
        : filter === 'completed'
          ? row.status === 'completed'
          : row.status !== 'completed',
    )
  const timelineWidth = model.days.length * dayWidth
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollToToday = useCallback(() => {
    const el = scrollRef.current
    if (!el || model.todayIndex < 0) return
    const visible = el.clientWidth - LEFT_WIDTH
    el.scrollTo({ left: Math.max(0, model.todayIndex * dayWidth - visible / 3), behavior: 'smooth' })
  }, [dayWidth, model.todayIndex])

  useEffect(() => {
    scrollToToday()
  }, [scrollToToday])

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

  const zoomIndex = ZOOMS.indexOf(zoom)

  return (
    // 프로젝트 상세 패널의 p-4를 상쇄해 툴바와 그리드를 패널 가장자리까지 붙인다
    <div className="isolate -m-4 flex h-[calc(100%+2rem)] min-h-[520px] flex-col">
      {/* 툴바: 좌측 생성·새로고침·요약, 우측 확대/축소·눈금·오늘 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
        {canManage && (
          <Button
            size="icon"
            aria-label="마일스톤 추가"
            title="마일스톤 추가"
            onClick={() => openCreateDialog()}
          >
            <Plus />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="새로고침"
          title="새로고침"
          disabled={isRefreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw className={cn(isRefreshing && 'animate-spin')} />
        </Button>
        <span className="ml-1 text-sm text-muted-foreground tabular-nums">
          {model.stats.completed}/{model.stats.total} 완료
        </span>
        {model.stats.overdue > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
            <AlertTriangle className="size-3" />
            지연 {model.stats.overdue}
          </span>
        )}
        {model.stats.dueSoon > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
            <Clock3 className="size-3" />
            임박 {model.stats.dueSoon}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="확대"
            title="확대"
            disabled={zoomIndex === ZOOMS.length - 1}
            onClick={() => setZoom(ZOOMS[zoomIndex + 1])}
          >
            <ZoomIn />
          </Button>
          <div
            className="flex h-8 items-center gap-1 rounded-md border bg-background px-2"
            aria-label="표시 단위"
          >
            {SCALE_LABELS.map((scale, i) => (
              <span key={scale.key} className="flex items-center gap-1">
                {i > 0 && <span className="text-xs text-muted-foreground">›</span>}
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs font-medium',
                    ZOOMS.indexOf(scale.key) <= zoomIndex
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {scale.label}
                </span>
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="축소"
            title="축소"
            disabled={zoomIndex === 0}
            onClick={() => setZoom(ZOOMS[zoomIndex - 1])}
          >
            <ZoomOut />
          </Button>
          <Button variant="outline" className="ml-2" onClick={scrollToToday}>
            오늘
          </Button>
        </div>
      </div>

      {model.rows.length === 0 ? (
        <div className="flex-1 p-4">
          <EmptyState
            className="h-full"
            icon={<Flag />}
            title="등록된 마일스톤이 없습니다."
            description="주요 일정과 목표를 마일스톤으로 등록하세요."
            action={
              canManage && (
                <Button onClick={() => openCreateDialog()}>
                  <Plus data-icon="inline-start" />첫 마일스톤 추가
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          <div className="flex min-h-full flex-col" style={{ width: totalWidth }}>
            {/* 헤더: 좌측 목록 머리 + 우측 월/주/일 */}
            <div className="sticky top-0 z-30 flex shrink-0 border-b bg-card" style={{ height: HEADER_HEIGHT }}>
              <div
                className="sticky left-0 z-40 flex shrink-0 flex-col justify-between border-r bg-card px-3 py-1"
                style={{ width: LEFT_WIDTH }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Flag className="size-4 text-primary" />
                    마일스톤
                    <CountBadge>{rows.length}</CountBadge>
                  </span>
                  <div className="inline-flex rounded-lg bg-muted p-0.5">
                      {FILTERS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={filter === item.key}
                          onClick={() => setFilter(item.key)}
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs transition-colors',
                            filter === item.key
                              ? 'bg-background font-medium text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                  </div>
                </div>
                <div className="flex items-center text-[11px] text-muted-foreground">
                  <span className="flex-1 pl-7">마일스톤</span>
                  <span className="w-20 text-right">D-Day</span>
                  <span className="w-12 text-center">상태</span>
                </div>
              </div>
              <TimelineHeader model={model} dayWidth={dayWidth} zoom={zoom} />
            </div>

            {rows.map(({ row, index }) => (
              <div
                key={row.id}
                className="group flex shrink-0 border-b hover:bg-muted/40"
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
                <div className="relative" style={{ width: timelineWidth }}>
                  <TimelineGrid model={model} dayWidth={dayWidth} zoom={zoom} />
                  <GanttBar row={row} dayWidth={dayWidth} />
                </div>
              </div>
            ))}

            {canManage && (
              <div className="flex shrink-0 border-b" style={{ height: ROW_HEIGHT }}>
                <button
                  type="button"
                  className="sticky left-0 z-20 flex items-center gap-2 border-r bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  style={{ width: LEFT_WIDTH }}
                  onClick={() => openCreateDialog()}
                  title="마일스톤 추가 (오른쪽 그리드를 드래그해 기간을 지정할 수도 있습니다)"
                >
                  <Plus className="size-4" />
                  새 마일스톤
                </button>
                <div className="relative" style={{ width: timelineWidth }}>
                  <TimelineGrid
                    model={model}
                    dayWidth={dayWidth}
                    zoom={zoom}
                    selectedStartIndex={dragMin}
                    selectedEndIndex={dragMax}
                  />
                  <div className="absolute inset-0 flex">
                    {model.days.map((day, index) => (
                      <div
                        key={day.date.toISOString()}
                        className="shrink-0 cursor-crosshair"
                        style={{ width: dayWidth }}
                        {...createCellProps(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 남은 높이까지 그리드를 이어 그린다 */}
            <div className="flex flex-1">
              <div className="sticky left-0 z-20 shrink-0 border-r bg-card" style={{ width: LEFT_WIDTH }} />
              <div className="relative" style={{ width: timelineWidth }}>
                <TimelineGrid model={model} dayWidth={dayWidth} zoom={zoom} />
              </div>
            </div>
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
  dayWidth,
  zoom,
}: {
  model: MilestoneGanttModel
  dayWidth: number
  zoom: Zoom
}) {
  return (
    <div className="flex flex-col text-xs" style={{ width: model.days.length * dayWidth }}>
      <div className="flex flex-1 border-b last:border-b-0">
        {model.monthGroups.map((group) => (
          <div
            key={`${group.label}-${group.startIndex}`}
            className="flex shrink-0 items-center border-r font-semibold whitespace-nowrap"
            style={{ width: group.span * dayWidth }}
          >
            {/* 가로 스크롤해도 달 이름이 좌측 목록 바로 옆에 붙어 보이게 한다 */}
            {group.span * dayWidth >= 64 && (
              <span className="sticky px-2" style={{ left: LEFT_WIDTH }}>
                {group.label}
              </span>
            )}
          </div>
        ))}
      </div>
      {zoom !== 'month' && (
        <div className="flex flex-1 border-b last:border-b-0">
          {model.weekGroups.map((group) => (
            <div
              key={`${group.label}-${group.startIndex}`}
              className="flex shrink-0 items-center justify-center overflow-hidden border-r text-muted-foreground"
              style={{ width: group.span * dayWidth }}
              title={group.label}
            >
              {group.span * dayWidth >= 28 && `${getWeekOfMonth(model.days[group.startIndex].date)}주`}
            </div>
          ))}
        </div>
      )}
      {zoom === 'day' && (
        <div className="flex flex-1">
          {model.days.map((day, index) => (
            <div
              key={day.date.toISOString()}
              className={cn(
                'flex shrink-0 items-center justify-center border-r tabular-nums',
                day.isWeekend ? 'text-muted-foreground' : 'text-foreground',
              )}
              style={{ width: dayWidth }}
              title={day.dayOfWeek}
            >
              <span
                className={cn(
                  'rounded px-1',
                  index === model.todayIndex && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {day.dayOfMonth}
              </span>
            </div>
          ))}
        </div>
      )}
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
  const dateRange = row.isPoint
    ? formatGanttDate(row.dueDate)
    : `${formatGanttDate(row.startDate)} - ${formatGanttDate(row.dueDate)} (${row.durationLabel})`
  const isDone = row.status === 'completed'

  return (
    <div
      className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r bg-card px-3 group-hover:bg-muted"
      style={{ width: LEFT_WIDTH }}
      title={dateRange}
    >
      {canManage && milestone ? (
        <button
          type="button"
          onClick={() => onToggle(milestone)}
          aria-label={isDone ? '완료 취소' : '완료로 표시'}
          title={isDone ? '완료 취소' : '완료로 표시'}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isDone
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-muted-foreground/30 text-transparent hover:border-primary',
          )}
        >
          <Check className="size-3" />
        </button>
      ) : (
        <Flag className={cn('size-4 shrink-0', isDone ? 'text-green-500' : 'text-primary')} />
      )}
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        M-{String(index + 1).padStart(2, '0')}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          isDone && 'text-muted-foreground line-through',
        )}
      >
        {row.title}
      </span>
      {canManage && milestone && (
        <span className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(milestone)}
            aria-label="마일스톤 수정"
            title="마일스톤 수정"
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="hover:text-destructive"
            onClick={() => onDelete(row.id)}
            aria-label="마일스톤 삭제"
            title="마일스톤 삭제"
          >
            <Trash2 />
          </Button>
        </span>
      )}
      <span
        className={cn(
          'w-20 shrink-0 text-right text-[11px] whitespace-nowrap tabular-nums',
          row.status === 'overdue' ? 'font-semibold text-red-600' : 'text-muted-foreground',
        )}
      >
        {row.dDayLabel}
      </span>
      <span
        className={cn(
          'w-12 shrink-0 rounded-full py-0.5 text-center text-[11px] font-medium',
          statusStyle[row.status].pill,
        )}
      >
        {statusLabel[row.status]}
      </span>
    </div>
  )
}

function TimelineGrid({
  model,
  dayWidth,
  zoom,
  selectedStartIndex,
  selectedEndIndex,
}: {
  model: MilestoneGanttModel
  dayWidth: number
  zoom: Zoom
  selectedStartIndex?: number | null
  selectedEndIndex?: number | null
}) {
  const hasSelection =
    selectedStartIndex !== null &&
    selectedStartIndex !== undefined &&
    selectedEndIndex !== null &&
    selectedEndIndex !== undefined
  const columns = zoom === 'day' ? null : zoom === 'week' ? model.weekGroups : model.monthGroups

  return (
    <div className="pointer-events-none absolute inset-0">
      {columns ? (
        <div className="absolute inset-0 flex">
          {columns.map((group) => (
            <div
              key={`${group.label}-${group.startIndex}`}
              className="h-full shrink-0 border-r"
              style={{ width: group.span * dayWidth }}
            />
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex">
          {model.days.map((day) => (
            <div
              key={day.date.toISOString()}
              className={cn('h-full shrink-0 border-r', day.isWeekend && 'bg-muted/40')}
              style={{ width: dayWidth }}
            />
          ))}
        </div>
      )}
      {model.todayIndex >= 0 && model.todayIndex < model.days.length && (
        <div
          className="absolute inset-y-0 bg-primary/5"
          style={{ left: model.todayIndex * dayWidth, width: Math.max(dayWidth, 2) }}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/60" />
        </div>
      )}
      {hasSelection && (
        <div
          className="absolute inset-y-0 bg-primary/15"
          style={{
            left: selectedStartIndex * dayWidth,
            width: (selectedEndIndex - selectedStartIndex + 1) * dayWidth,
          }}
        />
      )}
    </div>
  )
}

function GanttBar({ row, dayWidth }: { row: MilestoneGanttRow; dayWidth: number }) {
  const style = statusStyle[row.status]
  const barTitle = `${row.title} · ${formatGanttDate(row.startDate)} - ${formatGanttDate(row.dueDate)}`

  if (row.isPoint) {
    return (
      <div
        className={cn(
          'absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ring-2 ring-background',
          style.bar,
        )}
        style={{ left: row.endIndex * dayWidth + dayWidth / 2 }}
        title={barTitle}
      />
    )
  }

  const left = row.startIndex * dayWidth + 1
  const width = Math.max(row.spanDays * dayWidth - 2, 6)

  return (
    <div
      className={cn(
        'absolute top-1/2 z-10 flex h-6 -translate-y-1/2 items-center gap-1 overflow-hidden rounded-sm px-2 text-xs font-medium whitespace-nowrap',
        style.bar,
        row.status === 'completed' && 'opacity-80',
      )}
      style={{ left, width }}
      title={barTitle}
    >
      {width >= 48 && <span className="truncate">{row.title}</span>}
    </div>
  )
}
