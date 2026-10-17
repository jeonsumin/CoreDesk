import { toDateInputValue } from './gantt'

type DateInput = Date | string

export type TimelineIssueInput = {
  id: string
  title: string
  type: 'EPIC' | 'STORY' | 'TASK'
  epicId: string | null
  number: number | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  startDate: DateInput | null
  dueDate: DateInput | null
}

export type TimelineRow<T extends TimelineIssueInput = TimelineIssueInput> =
  | (T & { kind: 'epic'; startDate: null; dueDate: null })
  | (T & { kind: 'issue'; startDate: string | null; dueDate: string | null })
  | { kind: 'group'; id: 'none'; title: string; startDate: null; dueDate: null }

const byNumber = (left: TimelineIssueInput, right: TimelineIssueInput) =>
  (left.number ?? Number.MAX_SAFE_INTEGER) - (right.number ?? Number.MAX_SAFE_INTEGER)

const dateValue = (value: DateInput | null) => (value ? toDateInputValue(new Date(value)) : null)

// 타임라인 행 순서: 에픽 → 그 하위 이슈들, 마지막에 '에픽 없음' 그룹과 미할당 이슈.
// 에픽은 묶음 머리 행일 뿐이라 날짜를 비워 막대를 그리지 않는다 (막대는 이슈만)
export function buildTimelineRows<T extends TimelineIssueInput>(items: T[]): TimelineRow<T>[] {
  const epics = items.filter((item) => item.type === 'EPIC').sort(byNumber)
  const epicIds = new Set(epics.map((epic) => epic.id))
  const issues = items.filter((item) => item.type !== 'EPIC').sort(byNumber)
  const rows: TimelineRow<T>[] = []

  for (const epic of epics) {
    rows.push({ ...epic, kind: 'epic', startDate: null, dueDate: null })
    for (const child of issues.filter((issue) => issue.epicId === epic.id)) {
      rows.push({ ...child, kind: 'issue', startDate: dateValue(child.startDate), dueDate: dateValue(child.dueDate) })
    }
  }

  const orphans = issues.filter((issue) => !issue.epicId || !epicIds.has(issue.epicId))
  if (orphans.length > 0) {
    rows.push({ kind: 'group', id: 'none', title: '에픽 없음', startDate: null, dueDate: null })
    for (const issue of orphans) {
      rows.push({ ...issue, kind: 'issue', startDate: dateValue(issue.startDate), dueDate: dateValue(issue.dueDate) })
    }
  }

  return rows
}
