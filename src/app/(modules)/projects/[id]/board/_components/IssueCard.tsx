'use client'

import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AssigneeAvatars, EpicBadge, PriorityIcon, TypeIcon, type BoardIssue } from './issue-meta'

type Props = {
  issue: BoardIssue
  issueKey: string | null
  epic?: { issueKey: string | null; title: string }
  canDrag: boolean
  onDragStart: (issueId: string) => void
  onOpen: (issueId: string) => void
}

// board.html 카드: 에픽 배지 / 제목 / 타입·키·우선순위 / 담당자
export function IssueCard({ issue, issueKey, epic, canDrag, onDragStart, onOpen }: Props) {
  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(issue.id)
      }}
      onClick={() => onOpen(issue.id)}
      className={cn(
        'block w-full space-y-2 rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow select-none hover:shadow-md',
        canDrag && 'cursor-grab active:cursor-grabbing active:opacity-70',
        issue.status === 'DONE' && 'opacity-70',
      )}
    >
      {epic && <EpicBadge issueKey={epic.issueKey} title={epic.title} />}
      <p className="break-words text-sm font-medium leading-snug">{issue.title}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TypeIcon type={issue.type} />
        {issueKey && <span className="font-medium">{issueKey}</span>}
        <PriorityIcon priority={issue.priority} />
        <span className="ml-auto">
          {issue.assignees.length > 0 ? (
            <AssigneeAvatars assignees={issue.assignees} />
          ) : (
            <span
              title="미배정"
              className="flex size-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40"
            >
              <UserRound className="size-3" />
            </span>
          )}
        </span>
      </div>
    </button>
  )
}
