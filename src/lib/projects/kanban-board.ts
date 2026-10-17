const DAY_MS = 24 * 60 * 60 * 1000
const DUE_SOON_DAYS = 3

export const KANBAN_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
] as const

export const KANBAN_COLUMNS = [
  {
    status: 'TODO',
    label: '할 일',
    description: '착수 전',
    dotClassName: 'bg-zinc-400',
  },
  {
    status: 'IN_PROGRESS',
    label: '진행 중',
    description: '작업 중',
    dotClassName: 'bg-blue-500',
  },
  {
    status: 'DONE',
    label: '완료',
    description: '종료됨',
    dotClassName: 'bg-green-500',
  },
] as const satisfies readonly KanbanColumnDefinition[]

export type KanbanStatus = (typeof KANBAN_STATUSES)[number]
export type KanbanPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type KanbanDueBucket = 'overdue' | 'dueSoon' | 'later' | 'none'
export type KanbanDueFilter = 'all' | KanbanDueBucket
export type KanbanPriorityFilter = 'all' | KanbanPriority
export type KanbanAssigneeFilter = 'all' | 'unassigned' | string
// 'all' | 'none'(에픽 미할당) | 에픽 id
export type KanbanEpicFilter = 'all' | 'none' | string

export type KanbanTaskInput = {
  id: string
  title: string
  description: string | null
  type: 'EPIC' | 'STORY' | 'TASK'
  epicId: string | null
  status: KanbanStatus
  priority: KanbanPriority
  dueDate: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  assignees: { id: string; name: string }[]
}

export type KanbanFilters = {
  query?: string
  epic?: KanbanEpicFilter
  assigneeId?: KanbanAssigneeFilter
  priority?: KanbanPriorityFilter
  due?: KanbanDueFilter
}

export type KanbanDueState = {
  bucket: KanbanDueBucket
  label: string
  days: number | null
}

export type KanbanTaskModel<TTask extends KanbanTaskInput = KanbanTaskInput> =
  TTask & {
    dueState: KanbanDueState
  }

export type KanbanColumnDefinition = {
  status: KanbanStatus
  label: string
  description: string
  dotClassName: string
}

export type KanbanColumnModel<TTask extends KanbanTaskInput = KanbanTaskInput> =
  KanbanColumnDefinition & {
    tasks: KanbanTaskModel<TTask>[]
    totalCount: number
    highPriorityCount: number
    overdueCount: number
    dueSoonCount: number
  }

export type KanbanEpicSummary<TTask extends KanbanTaskInput = KanbanTaskInput> = TTask & {
  total: number
  done: number
  progress: number
}

export type KanbanBoardModel<TTask extends KanbanTaskInput = KanbanTaskInput> = {
  columns: KanbanColumnModel<TTask>[]
  epics: KanbanEpicSummary<TTask>[]
  stats: {
    total: number
    visible: number
    completed: number
    progress: number
    overdue: number
    dueSoon: number
    unassigned: number
    withoutEpic: number
  }
}

type BuildKanbanBoardOptions = {
  today?: Date
  filters?: KanbanFilters
}

const priorityRank: Record<KanbanPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

// 에픽은 컬럼 카드가 아니라 좌측 에픽 패널 항목이 된다. 진행률·통계도 에픽을 뺀 이슈 기준
export function buildKanbanBoardModel<TTask extends KanbanTaskInput>(
  items: TTask[],
  options: BuildKanbanBoardOptions = {},
): KanbanBoardModel<TTask> {
  const tasks = items.filter((item) => item.type !== 'EPIC')
  const epics = items
    .filter((item) => item.type === 'EPIC')
    .map<KanbanEpicSummary<TTask>>((epic) => {
      const children = tasks.filter((task) => task.epicId === epic.id)
      const done = children.filter((task) => task.status === 'DONE').length
      return {
        ...epic,
        total: children.length,
        done,
        progress: children.length === 0 ? 0 : Math.round((done / children.length) * 100),
      }
    })
  const today = options.today ?? new Date()
  const filters = normalizeFilters(options.filters)
  const decoratedTasks = tasks
    .map<KanbanTaskModel<TTask>>((task) => ({
      ...task,
      dueState: getKanbanDueState(task.dueDate, today),
    }))
    .sort(compareKanbanTasks)

  const visibleTasks = decoratedTasks.filter((task) =>
    matchesKanbanFilters(task, filters),
  )

  const columns = KANBAN_COLUMNS.map<KanbanColumnModel<TTask>>((column) => {
    const columnTasks = visibleTasks.filter(
      (task) => task.status === column.status,
    )
    const activeTasks = columnTasks.filter((task) => task.status !== 'DONE')

    return {
      ...column,
      tasks: columnTasks,
      totalCount: columnTasks.length,
      highPriorityCount: activeTasks.filter((task) => task.priority === 'HIGH')
        .length,
      overdueCount: activeTasks.filter(
        (task) => task.dueState.bucket === 'overdue',
      ).length,
      dueSoonCount: activeTasks.filter(
        (task) => task.dueState.bucket === 'dueSoon',
      ).length,
    }
  })

  const completed = tasks.filter((task) => task.status === 'DONE').length
  const activeVisibleTasks = visibleTasks.filter((task) => task.status !== 'DONE')

  return {
    columns,
    epics,
    stats: {
      total: tasks.length,
      visible: visibleTasks.length,
      completed,
      progress:
        tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
      overdue: activeVisibleTasks.filter(
        (task) => task.dueState.bucket === 'overdue',
      ).length,
      dueSoon: activeVisibleTasks.filter(
        (task) => task.dueState.bucket === 'dueSoon',
      ).length,
      unassigned: activeVisibleTasks.filter((task) => task.assignees.length === 0).length,
      withoutEpic: tasks.filter((task) => !task.epicId).length,
    },
  }
}

export function getKanbanDueState(
  dueDate: Date | string | null,
  today: Date = new Date(),
): KanbanDueState {
  if (!dueDate) {
    return { bucket: 'none', label: '마감 없음', days: null }
  }

  const normalizedDueDate = normalizeDate(dueDate)
  const normalizedToday = normalizeToday(today)
  const days = Math.round(
    (normalizedDueDate.getTime() - normalizedToday.getTime()) / DAY_MS,
  )

  if (days < 0) {
    return { bucket: 'overdue', label: `D+${Math.abs(days)} 초과`, days }
  }

  if (days === 0) {
    return { bucket: 'dueSoon', label: '오늘', days }
  }

  if (days <= DUE_SOON_DAYS) {
    return { bucket: 'dueSoon', label: `D-${days}`, days }
  }

  return { bucket: 'later', label: `D-${days}`, days }
}

function normalizeFilters(filters: KanbanFilters = {}): Required<KanbanFilters> {
  return {
    query: filters.query?.trim().toLowerCase() ?? '',
    epic: filters.epic || 'all',
    assigneeId: filters.assigneeId || 'all',
    priority: filters.priority || 'all',
    due: filters.due || 'all',
  }
}

function matchesKanbanFilters(
  task: KanbanTaskModel,
  filters: Required<KanbanFilters>,
): boolean {
  if (filters.query) {
    const searchable = [
      task.title,
      task.description ?? '',
      ...task.assignees.map((assignee) => assignee.name),
    ]
      .join(' ')
      .toLowerCase()

    if (!searchable.includes(filters.query)) return false
  }

  if (filters.epic === 'none' && task.epicId) return false
  if (filters.epic !== 'all' && filters.epic !== 'none' && task.epicId !== filters.epic) {
    return false
  }

  if (filters.assigneeId === 'unassigned' && task.assignees.length > 0) return false
  if (
    filters.assigneeId !== 'all' &&
    filters.assigneeId !== 'unassigned' &&
    !task.assignees.some((assignee) => assignee.id === filters.assigneeId)
  ) {
    return false
  }

  if (filters.priority !== 'all' && task.priority !== filters.priority) {
    return false
  }
  if (filters.due !== 'all' && task.dueState.bucket !== filters.due) return false

  return true
}

function compareKanbanTasks(
  left: KanbanTaskModel,
  right: KanbanTaskModel,
): number {
  const byPriority = priorityRank[left.priority] - priorityRank[right.priority]
  if (byPriority !== 0) return byPriority

  const byDueDate =
    getDateSortValue(left.dueDate) - getDateSortValue(right.dueDate)
  if (byDueDate !== 0) return byDueDate

  const byCreatedAt =
    getDateSortValue(left.createdAt ?? null) -
    getDateSortValue(right.createdAt ?? null)
  if (byCreatedAt !== 0) return byCreatedAt

  return left.title.localeCompare(right.title, 'ko-KR')
}

function getDateSortValue(date: Date | string | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER
  return normalizeDate(date).getTime()
}

function normalizeDate(value: Date | string): Date {
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnly) {
      return new Date(
        Date.UTC(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3]),
        ),
      )
    }
  }

  const date = new Date(value)
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function normalizeToday(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}
