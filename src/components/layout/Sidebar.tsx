'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { navItems, type NavItem } from '@/config/nav'
import { cn } from '@/lib/utils'

const linkClass = (isActive: boolean, disabled?: boolean) =>
  cn(
    'flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-normal transition-colors',
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    disabled && 'pointer-events-none opacity-50'
  )

function NavLink({
  item,
  pathname,
  indent,
}: {
  item: NavItem
  pathname: string
  indent?: boolean
}) {
  const Icon = item.icon
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + '/')
  return (
    <Link
      href={item.disabled ? '#' : item.href}
      aria-disabled={item.disabled}
      className={cn(linkClass(isActive, item.disabled), indent && 'ml-4')}
    >
      <Icon className="h-4 w-4" />
      {item.title}
      {item.disabled && <span className="ml-auto text-xs">예정</span>}
    </Link>
  )
}

function NavGroup({
  item,
  subItems,
  pathname,
}: {
  item: NavItem
  subItems: NavItem[]
  pathname: string
}) {
  const Icon = item.icon
  const inGroup = pathname === item.href || pathname.startsWith(item.href + '/')
  const [toggled, setToggled] = useState(false)
  const open = inGroup || toggled
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setToggled((v) => !v)}
        className={linkClass(false)}
      >
        <Icon className="h-4 w-4" />
        {item.title}
        <ChevronDown
          className={cn('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open &&
        subItems.map((child) => (
          <NavLink key={child.href} item={child} pathname={pathname} indent />
        ))}
    </div>
  )
}

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const items = navItems.filter((i) => !i.adminOnly || role === 'ADMIN')

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          CoreDesk
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {items.map((item) =>
          item.children ? (
            <NavGroup
              key={item.href}
              item={item}
              subItems={item.children}
              pathname={pathname}
            />
          ) : (
            <NavLink key={item.href} item={item} pathname={pathname} />
          )
        )}
      </nav>
    </aside>
  )
}
