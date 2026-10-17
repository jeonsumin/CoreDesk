import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatTone = 'default' | 'primary' | 'info' | 'warning' | 'success' | 'danger'

const toneClass: Record<StatTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  info: 'text-blue-600',
  warning: 'text-orange-500',
  success: 'text-green-500',
  danger: 'text-red-500',
}

// 아이콘+라벨은 좌상단, 큰 숫자는 우측 정렬. 숫자 색으로 의미를 구분한다
export function StatCard({
  icon,
  label,
  value,
  meta,
  tone = 'default',
  size = 'default',
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  meta?: ReactNode
  tone?: StatTone
  size?: 'default' | 'sm'
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-card shadow-sm',
        size === 'default' ? 'p-4' : 'p-3',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-muted-foreground [&_svg]:size-4',
          size === 'default' ? 'text-sm' : 'text-xs',
        )}
      >
        {icon}
        {label}
      </p>
      <p
        className={cn(
          'text-right font-bold tabular-nums',
          size === 'default' ? 'mt-2 text-2xl' : 'mt-1 text-xl',
          toneClass[tone],
        )}
      >
        {value}
      </p>
      {meta && <p className="text-right text-xs text-muted-foreground">{meta}</p>}
    </div>
  )
}

// 퍼센트 진행 막대. 트랙은 primary 옅은 색
export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-primary/15', className)}>
      <div
        className={cn('h-full rounded-full bg-primary transition-all', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
