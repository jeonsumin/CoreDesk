'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange, ChevronDown, ChevronRight, Plus, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import {
  buildGanttModel,
  formatGanttDate,
  getWeekOfMonth,
  type GanttModel,
  type GanttRow,
} from '@/lib/projects/gantt'
import { buildTimelineRows, type TimelineRow } from '@/lib/projects/issue-timeline'
import { formatIssueKey } from '@/lib/projects/issue-key'
import { IssueDetailDialog } from '../../board/_components/IssueDetailDialog'
import { IssueForm } from '../../board/_components/IssueForm'
import { AssigneeAvatars, TypeIcon, statusMeta, type BoardIssue, type MemberOption } from '../../board/_components/issue-meta'

// 시안 timeline.html: 좌측 에픽/이슈 목록 + 우측 월/주/일 그리드, 툴바에서 확대·축소
const LEFT_WIDTH = 420
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

const barStyle = {
  TODO: 'bg-sky-200 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100',
  IN_PROGRESS: 'bg-blue-500 text-white',
  DONE: 'bg-green-500 text-white',
}

type Props = {
  issues: BoardIssue[]
  projectId: string
  projectKey: string | null
  assignableMembers: MemberOption[]
  canManage: boolean
}

export function IssueTimeline({ issues, projectId, projectKey, assignableMembers, canManage }: Props) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [zoom, setZoom] = useState<Zoom>('day')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const dayWidth = DAY_WIDTH[zoom]

  const allRows = useMemo(() => buildTimelineRows(issues), [issues])
  // 접힌 에픽의 하위 이슈는 숨긴다
  const rows = useMemo(
    () => allRows.filter((row) => row.kind !== 'issue' || !row.epicId || !collapsed.has(row.epicId)),
    [allRows, collapsed],
  )
  const model = useMemo(
    () =>
      buildGanttModel(
        rows.map((row) => ({
          id: row.id,
          title: row.title,
          startDate: row.startDate,
          dueDate: row.dueDate,
          isCompleted: row.kind !== 'group' && row.status === 'DONE',
        })),
        { minDays: 35 },
      ),
    [rows],
  )
  const timelineWidth = model.days.length * dayWidth
  const totalWidth = LEFT_WIDTH + timelineWidth

  const epics = issues.filter((issue) => issue.type === 'EPIC')
  const epicOptions = epics.map((e) => ({ id: e.id, label: [formatIssueKey(projectKey, e.number), e.title].filter(Boolean).join(' ') }))
  const selectedIssue = issues.find((issue) => issue.id === selectedId) ?? null

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

  const toggleEpic = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const zoomIndex = ZOOMS.indexOf(zoom)

  return (
    // 프로젝트 상세 패널의 p-4를 상쇄해 툴바와 그리드를 패널 가장자리까지 붙인다
    <div className="isolate -m-4 flex h-[calc(100%+2rem)] min-h-[520px] flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
        {canManage && (
          <Button size="icon" aria-label="이슈 만들기" title="이슈 만들기" onClick={() => setCreateOpen(true)}>
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
          <div className="flex h-8 items-center gap-1 rounded-md border bg-background px-2" aria-label="표시 단위">
            {SCALE_LABELS.map((scale, i) => (
              <span key={scale.key} className="flex items-center gap-1">
                {i > 0 && <span className="text-xs text-muted-foreground">›</span>}
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs font-medium',
                    ZOOMS.indexOf(scale.key) <= zoomIndex ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
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

      {allRows.length === 0 ? (
        <div className="flex-1 p-4">
          <EmptyState
            className="h-full"
            icon={<CalendarRange />}
            title="타임라인에 표시할 이슈가 없습니다."
            description="보드에서 에픽과 이슈를 만들고 시작일·마감일을 지정하면 여기에 표시됩니다."
            action={
              canManage && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" />첫 이슈 만들기
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          <div className="flex min-h-full flex-col" style={{ width: totalWidth }}>
            <div className="sticky top-0 z-30 flex shrink-0 border-b bg-card" style={{ height: HEADER_HEIGHT }}>
              <div
                className="sticky left-0 z-40 flex shrink-0 items-end border-r bg-card px-3 pb-2 text-[11px] text-muted-foreground"
                style={{ width: LEFT_WIDTH }}
              >
                <span className="flex-1 pl-6">이슈</span>
                <span className="w-12 text-center">상태</span>
              </div>
              <TimelineHeader model={model} dayWidth={dayWidth} zoom={zoom} />
            </div>

            {rows.map((row, index) => (
              <div
                key={`${row.kind}-${row.id}`}
                className={cn('group flex shrink-0 border-b hover:bg-muted/40', row.kind === 'group' && 'bg-muted/30')}
                style={{ height: ROW_HEIGHT }}
              >
                <LeftCell
                  row={row}
                  issueKey={row.kind === 'group' ? null : formatIssueKey(projectKey, row.number)}
                  collapsed={collapsed.has(row.id)}
                  onToggle={() => toggleEpic(row.id)}
                  onOpen={() => row.kind !== 'group' && setSelectedId(row.id)}
                />
                <div className="relative" style={{ width: timelineWidth }}>
                  <TimelineGrid model={model} dayWidth={dayWidth} zoom={zoom} />
                  {row.kind === 'issue' && model.rows[index].hasBar && (
                    <GanttBar
                      row={model.rows[index]}
                      dayWidth={dayWidth}
                      className={barStyle[row.status]}
                      onClick={() => setSelectedId(row.id)}
                    />
                  )}
                </div>
              </div>
            ))}

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>이슈 만들기</DialogTitle>
          </DialogHeader>
          <IssueForm
            projectId={projectId}
            members={assignableMembers}
            epics={epicOptions}
            onSuccess={() => setCreateOpen(false)}
          />
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

function TimelineHeader({
  model,
  dayWidth,
  zoom,
}: {
  model: GanttModel
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

function LeftCell({
  row,
  issueKey,
  collapsed,
  onToggle,
  onOpen,
}: {
  row: TimelineRow<BoardIssue>
  issueKey: string | null
  collapsed: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  if (row.kind === 'group') {
    return (
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-card px-3 pl-9 text-xs font-semibold text-muted-foreground"
        style={{ width: LEFT_WIDTH }}
      >
        {row.title}
      </div>
    )
  }

  const status = statusMeta[row.status]
  return (
    <div
      className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r bg-card px-3 group-hover:bg-muted"
      style={{ width: LEFT_WIDTH }}
    >
      {row.kind === 'epic' ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? '펼치기' : '접기'}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
        <TypeIcon type={row.type} />
        {issueKey && <span className="shrink-0 text-xs text-muted-foreground">{issueKey}</span>}
        <span className={cn('min-w-0 flex-1 truncate', row.kind === 'epic' && 'font-semibold')}>{row.title}</span>
      </button>
      <AssigneeAvatars assignees={row.assignees} max={1} />
      <span className={cn('w-12 shrink-0 rounded-full py-0.5 text-center text-[11px] font-medium', status.className)}>
        {status.short}
      </span>
    </div>
  )
}

function TimelineGrid({
  model,
  dayWidth,
  zoom,
}: {
  model: GanttModel
  dayWidth: number
  zoom: Zoom
}) {
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
    </div>
  )
}

function GanttBar({
  row,
  dayWidth,
  className,
  onClick,
}: {
  row: GanttRow
  dayWidth: number
  className: string
  onClick: () => void
}) {
  const barTitle = `${row.title} · ${formatGanttDate(row.startDate)} - ${formatGanttDate(row.dueDate)}`
  const left = row.startIndex * dayWidth + 1
  const width = Math.max(row.spanDays * dayWidth - 2, 6)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-sm px-2 text-xs font-medium whitespace-nowrap',
        className,
      )}
      style={{ left, width }}
      title={barTitle}
    >
      {width >= 48 && <span className="truncate">{row.title}</span>}
    </button>
  )
}
