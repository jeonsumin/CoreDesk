'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MilestoneForm } from './MilestoneForm'
import { toggleMilestone, deleteMilestone } from '../_actions/milestone'
import type { Milestone } from '@/types'

type Props = {
  milestone: Milestone
  projectId: string
  nowMs: number
}

export function MilestoneItem({ milestone, projectId, nowMs }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const daysLeft = Math.ceil(
    (new Date(milestone.dueDate).getTime() - nowMs) / 86400000
  )

  const handleToggle = () => {
    startTransition(() => {
      toggleMilestone(milestone.id, projectId, !milestone.isCompleted)
    })
  }

  const handleDelete = () => {
    startTransition(() => {
      deleteMilestone(milestone.id, projectId)
    })
  }

  return (
    <div
      className={cn(
        'flex min-h-14 items-center gap-3 border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/50',
        milestone.isCompleted && 'opacity-60',
      )}
    >
      <button
        type="button"
        aria-label={milestone.isCompleted ? '완료 취소' : '완료 처리'}
        title={milestone.isCompleted ? '완료 취소' : '완료 처리'}
        onClick={handleToggle}
        disabled={isPending}
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          milestone.isCompleted ? 'bg-primary border-primary' : 'border-muted-foreground'
        }`}
      >
        {milestone.isCompleted && (
          <svg
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            milestone.isCompleted ? 'line-through text-muted-foreground' : ''
          }`}
        >
          {milestone.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(milestone.dueDate).toLocaleDateString('ko-KR')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!milestone.isCompleted && daysLeft <= 7 && (
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 text-xs font-semibold',
              daysLeft < 0
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-orange-200 bg-orange-50 text-orange-600',
            )}
          >
            {daysLeft < 0 ? `D+${Math.abs(daysLeft)} 초과` : `D-${daysLeft}`}
          </span>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="마일스톤 수정"
                title="마일스톤 수정"
              />
            }
          >
            <Pencil />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>마일스톤 수정</DialogTitle>
            </DialogHeader>
            <MilestoneForm
              projectId={projectId}
              milestone={milestone}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="마일스톤 삭제"
          title="마일스톤 삭제"
          className="hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
