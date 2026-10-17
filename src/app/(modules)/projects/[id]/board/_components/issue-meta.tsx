import { Bookmark, ChevronDown, ChevronsUp, Minus, SquareCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IssueType, Priority, Task, TaskStatus, User } from '@/types'

// 보드·타임라인·상세 팝업이 함께 쓰는 이슈 형태 (서버 페이지에서 이 모양으로 넘긴다)
export type BoardIssue = Pick<
  Task,
  | 'id'
  | 'number'
  | 'type'
  | 'epicId'
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'startDate'
  | 'dueDate'
  | 'createdAt'
  | 'updatedAt'
> & {
  assignees: Pick<User, 'id' | 'name'>[]
  createdBy: Pick<User, 'id' | 'name'> | null
}

export type MemberOption = Pick<User, 'id' | 'name'>

export const statusMeta: Record<TaskStatus, { label: string; short: string; className: string }> = {
  TODO: { label: '할 일', short: '대기', className: 'bg-muted text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', short: '진행', className: 'bg-blue-100 text-blue-700' },
  DONE: { label: '완료', short: '완료', className: 'bg-green-100 text-green-700' },
}

export const typeMeta: Record<IssueType, { label: string; icon: typeof Zap; className: string }> = {
  EPIC: { label: '에픽', icon: Zap, className: 'text-purple-500' },
  STORY: { label: '스토리', icon: Bookmark, className: 'text-green-600' },
  TASK: { label: '작업', icon: SquareCheck, className: 'text-sky-500' },
}

export const priorityMeta: Record<Priority, { label: string; icon: typeof Minus; className: string }> = {
  HIGH: { label: '높음', icon: ChevronsUp, className: 'text-red-500' },
  MEDIUM: { label: '보통', icon: Minus, className: 'text-orange-400' },
  LOW: { label: '낮음', icon: ChevronDown, className: 'text-sky-500' },
}

export function TypeIcon({ type, className }: { type: IssueType; className?: string }) {
  const meta = typeMeta[type]
  const Icon = meta.icon
  return <Icon aria-label={meta.label} className={cn('size-4 shrink-0', meta.className, className)} />
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  const meta = priorityMeta[priority]
  const Icon = meta.icon
  return <Icon aria-label={`우선순위 ${meta.label}`} className={cn('size-4 shrink-0', meta.className)} />
}

// 에픽 배지: "BB-CIC-WEB-1 기획"
export function EpicBadge({ issueKey, title }: { issueKey: string | null; title: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded border border-purple-300 px-1.5 text-xs text-purple-600">
      {issueKey && <span className="shrink-0">{issueKey}</span>}
      <span className="truncate">{title}</span>
    </span>
  )
}

export function AssigneeAvatars({ assignees, max = 2 }: { assignees: MemberOption[]; max?: number }) {
  if (assignees.length === 0) return null
  const shown = assignees.slice(0, max)
  return (
    <span className="flex shrink-0 -space-x-1.5" title={assignees.map((a) => a.name).join(', ')}>
      {shown.map((assignee) => (
        <span
          key={assignee.id}
          className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-semibold text-primary"
        >
          {assignee.name.slice(0, 2)}
        </span>
      ))}
      {assignees.length > max && (
        <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold">
          +{assignees.length - max}
        </span>
      )}
    </span>
  )
}
