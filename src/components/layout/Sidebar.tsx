'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from '@/config/nav'
import { cn } from '@/lib/utils'

// role은 Task 4에서 메뉴 필터링에 사용
export function Sidebar(_props: { role: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          CoreDesk
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              aria-disabled={item.disabled}
              className={cn(
                'flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-normal transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                item.disabled && 'pointer-events-none opacity-50'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
              {item.disabled && (
                <span className="ml-auto text-xs">예정</span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
