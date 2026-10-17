import Link from 'next/link'
import { cn } from '@/lib/utils'

export type SegmentedTabItem = {
  key: string
  label: string
  href: string
  count?: number
}

type Props = {
  items: SegmentedTabItem[]
  activeKey: string
  size?: 'default' | 'sm'
}

// 회색 트랙 위 알약형 탭. 활성 탭만 primary로 채운다
export function SegmentedTabs({ items, activeKey, size = 'default' }: Props) {
  return (
    <nav className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1">
      {items.map((item) => {
        const active = item.key === activeKey
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
              size === 'default' ? 'min-w-20 px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs',
              active
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('text-xs', active ? 'opacity-80' : 'opacity-60')}>
                {item.count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
