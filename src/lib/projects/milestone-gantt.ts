const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_MIN_DAYS = 35
const DEFAULT_PAST_PADDING_DAYS = 5
const DEFAULT_FUTURE_PADDING_DAYS = 14
const DUE_SOON_DAYS = 3

type DateInput = Date | string

export type MilestoneGanttInput = {
  id: string
  title: string
  startDate: DateInput | null
  dueDate: DateInput
  isCompleted: boolean
}

export type MilestoneGanttStatus =
  | 'completed'
  | 'overdue'
  | 'dueSoon'
  | 'inProgress'
  | 'scheduled'

export type MilestoneGanttDay = {
  date: Date
  dayOfMonth: number
  dayOfWeek: string
  isWeekend: boolean
}

export type MilestoneGanttGroup = {
  label: string
  startIndex: number
  span: number
}

export type MilestoneGanttRow = {
  id: string
  title: string
  startDate: Date
  dueDate: Date
  startIndex: number
  endIndex: number
  spanDays: number
  isPoint: boolean
  status: MilestoneGanttStatus
  dDayLabel: string
  durationLabel: string
}

export type MilestoneGanttModel = {
  timelineStart: Date
  timelineEnd: Date
  days: MilestoneGanttDay[]
  weekGroups: MilestoneGanttGroup[]
  monthGroups: MilestoneGanttGroup[]
  rows: MilestoneGanttRow[]
  todayIndex: number
  stats: {
    total: number
    completed: number
    overdue: number
    dueSoon: number
  }
}

type BuildOptions = {
  today?: Date
  minDays?: number
}

export function buildMilestoneGanttModel(
  milestones: MilestoneGanttInput[],
  options: BuildOptions = {},
): MilestoneGanttModel {
  const today = normalizeToday(options.today ?? new Date())
  const normalized = milestones.map((milestone) => {
    const dueDate = normalizeDate(milestone.dueDate)
    const rawStartDate = milestone.startDate
      ? normalizeDate(milestone.startDate)
      : dueDate
    const startDate = rawStartDate <= dueDate ? rawStartDate : dueDate
    const endDate = rawStartDate <= dueDate ? dueDate : rawStartDate

    return {
      ...milestone,
      startDate,
      dueDate: endDate,
      isPoint: !milestone.startDate || isSameUtcDate(startDate, endDate),
    }
  })

  const rangeDates = normalized.flatMap((milestone) => [
    milestone.startDate.getTime(),
    milestone.dueDate.getTime(),
  ])
  rangeDates.push(today.getTime())

  const rangeStart = new Date(Math.min(...rangeDates))
  const rangeEnd = new Date(Math.max(...rangeDates))
  const timelineStart = getMondayOfUtc(addUtcDays(rangeStart, -DEFAULT_PAST_PADDING_DAYS))
  const paddedEnd = addUtcDays(rangeEnd, DEFAULT_FUTURE_PADDING_DAYS)
  const neededDays = daysBetween(timelineStart, paddedEnd) + 1
  const dayCount = Math.max(options.minDays ?? DEFAULT_MIN_DAYS, neededDays)
  const timelineEnd = addUtcDays(timelineStart, dayCount - 1)
  const days = Array.from({ length: dayCount }, (_, index) =>
    buildDay(addUtcDays(timelineStart, index)),
  )

  const rows = normalized
    .map<MilestoneGanttRow>((milestone) => {
      const startIndex = daysBetween(timelineStart, milestone.startDate)
      const endIndex = daysBetween(timelineStart, milestone.dueDate)
      const spanDays = endIndex - startIndex + 1
      const status = getMilestoneStatus({
        dueDate: milestone.dueDate,
        startDate: milestone.startDate,
        isCompleted: milestone.isCompleted,
        today,
      })

      return {
        id: milestone.id,
        title: milestone.title,
        startDate: milestone.startDate,
        dueDate: milestone.dueDate,
        startIndex,
        endIndex,
        spanDays,
        isPoint: milestone.isPoint,
        status,
        dDayLabel: getDDayLabel(milestone.dueDate, today, milestone.isCompleted),
        durationLabel: milestone.isPoint ? '1일' : `${spanDays}일`,
      }
    })
    .sort((left, right) => {
      const byStart = left.startDate.getTime() - right.startDate.getTime()
      if (byStart !== 0) return byStart
      return left.dueDate.getTime() - right.dueDate.getTime()
    })

  return {
    timelineStart,
    timelineEnd,
    days,
    weekGroups: buildWeekGroups(days),
    monthGroups: buildMonthGroups(days),
    rows,
    todayIndex: daysBetween(timelineStart, today),
    stats: {
      total: rows.length,
      completed: rows.filter((row) => row.status === 'completed').length,
      overdue: rows.filter((row) => row.status === 'overdue').length,
      dueSoon: rows.filter((row) => row.status === 'dueSoon').length,
    },
  }
}

export function formatGanttDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return ''
  const normalized = normalizeDate(date)
  const year = normalized.getUTCFullYear()
  const month = String(normalized.getUTCMonth() + 1).padStart(2, '0')
  const day = String(normalized.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDate(value: DateInput): Date {
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
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getMondayOfUtc(date: Date): Date {
  const weekday = date.getUTCDay()
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1
  return addUtcDays(date, -daysFromMonday)
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

function isSameUtcDate(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime()
}

function buildDay(date: Date): MilestoneGanttDay {
  const weekday = date.getUTCDay()

  return {
    date,
    dayOfMonth: date.getUTCDate(),
    dayOfWeek: new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'UTC',
      weekday: 'short',
    }).format(date),
    isWeekend: weekday === 0 || weekday === 6,
  }
}

function buildWeekGroups(days: MilestoneGanttDay[]): MilestoneGanttGroup[] {
  return buildGroups(days, (day) => {
    const start = getMondayOfUtc(day.date)
    const end = addUtcDays(start, 6)
    const weekNumber = getIsoWeekNumber(day.date)
    return `Week ${weekNumber} ${formatCompactDate(start)} - ${formatCompactDate(end)}`
  })
}

function buildMonthGroups(days: MilestoneGanttDay[]): MilestoneGanttGroup[] {
  return buildGroups(days, (day) =>
    new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
    }).format(day.date),
  )
}

function buildGroups(
  days: MilestoneGanttDay[],
  getLabel: (day: MilestoneGanttDay) => string,
): MilestoneGanttGroup[] {
  return days.reduce<MilestoneGanttGroup[]>((groups, day, index) => {
    const label = getLabel(day)
    const previous = groups[groups.length - 1]

    if (previous?.label === label) {
      previous.span += 1
      return groups
    }

    groups.push({ label, startIndex: index, span: 1 })
    return groups
  }, [])
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(date)
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)
}

// 월요일 시작 기준으로 그 달의 몇째 주인지 (타임라인 헤더의 "3주" 표기)
export function getWeekOfMonth(date: Date) {
  const firstOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const offset = (firstOfMonth.getUTCDay() + 6) % 7
  return Math.ceil((date.getUTCDate() + offset) / 7)
}

function formatCompactDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getMilestoneStatus({
  dueDate,
  startDate,
  isCompleted,
  today,
}: {
  dueDate: Date
  startDate: Date
  isCompleted: boolean
  today: Date
}): MilestoneGanttStatus {
  if (isCompleted) return 'completed'

  const daysLeft = daysBetween(today, dueDate)
  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= DUE_SOON_DAYS) return 'dueSoon'
  if (startDate <= today && today <= dueDate) return 'inProgress'
  return 'scheduled'
}

function getDDayLabel(
  dueDate: Date,
  today: Date,
  isCompleted: boolean,
): string {
  if (isCompleted) return '완료'

  const daysLeft = daysBetween(today, dueDate)
  if (daysLeft < 0) return `D+${Math.abs(daysLeft)} 초과`
  if (daysLeft === 0) return 'D-Day'
  return `D-${daysLeft}`
}
