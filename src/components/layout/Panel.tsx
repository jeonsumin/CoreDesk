import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// 페이지의 큰 흰색 영역. 좌측 목록 패널과 우측 본문 패널 모두 이것으로 감싼다
export function Panel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        // relative: base-ui Select의 숨은 input(absolute)이 패널 밖으로 새어 창 전체가 스크롤되는 것을 막는다
        'relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card',
        className,
      )}
    >
      {children}
    </section>
  )
}

// 패널 상단 줄: 아이콘 + 제목 + 개수 배지 + 우측 액션
export function PanelHeader({
  icon,
  title,
  count,
  actions,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  count?: number
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="text-primary [&_svg]:size-4">{icon}</span>}
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {count !== undefined && <CountBadge>{count}</CountBadge>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

// 패널 상단의 아이콘 버튼 줄 (추가, 새로고침, 보기 전환 등)
export function PanelToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 border-b px-4 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CountBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">
      {children}
    </span>
  )
}

// 빈 상태: 아이콘 + 안내 문구 + 다음 행동
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl bg-muted/50 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <span className="text-muted-foreground/70 [&_svg]:size-8">{icon}</span>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
