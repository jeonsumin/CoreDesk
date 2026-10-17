import { getDday } from '@/lib/tasks/dday'
import { cn } from '@/lib/utils'

const toneClass = {
  danger: 'rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-600',
  warning: 'rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 font-semibold text-orange-600',
  neutral: 'text-muted-foreground',
}

export function DdayBadge({
  dueDate,
  nowMs,
  className,
}: {
  dueDate: Date | null
  nowMs: number
  className?: string
}) {
  if (!dueDate) return null
  const { label, tone } = getDday(new Date(dueDate), nowMs)
  return (
    <span className={cn('shrink-0 text-xs tabular-nums', toneClass[tone], className)}>
      {label}
    </span>
  )
}
