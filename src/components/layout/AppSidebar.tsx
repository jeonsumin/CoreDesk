'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronRight, ChevronsUpDown, LogOut } from 'lucide-react'
import { navItems, type NavGroup, type NavItem } from '@/config/nav'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

type SidebarUser = { name: string; email: string }

const GROUPS: NavGroup[] = ['업무', '자료', '관리']

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppSidebar({
  user,
  role,
  signOutAction,
}: {
  user: SidebarUser
  role: string
  signOutAction: () => Promise<void>
}) {
  const pathname = usePathname()
  const items = navItems.filter((item) => !item.adminOnly || role === 'ADMIN')

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="CoreDesk" render={<Link href="/dashboard" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                C
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">CoreDesk</span>
                <span className="truncate text-xs text-muted-foreground">사내 업무 관리</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.filter((group) => items.some((item) => item.group === group)).map((group) => (
          <SidebarGroup key={group}>
            {/* 아이콘 모드에서 숨은 라벨이 위 그룹의 마지막 메뉴를 덮어 클릭을 가로채지 않게 한다 */}
            <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
              {group}
            </SidebarGroupLabel>
            <SidebarMenu>
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon
                  if (item.children) {
                    return <NavItemWithChildren key={item.href} item={item} pathname={pathname} />
                  }
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActivePath(pathname, item.href)}
                        tooltip={item.title}
                        disabled={item.disabled}
                        render={<Link href={item.disabled ? '#' : item.href} />}
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} signOutAction={signOutAction} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// 하위 메뉴가 있는 항목 (시스템관리 > 사용자관리). 아이콘 모드에서는 첫 하위 메뉴로 바로 이동한다
function NavItemWithChildren({ item, pathname }: { item: NavItem; pathname: string }) {
  const { state, isMobile } = useSidebar()
  const inGroup = isActivePath(pathname, item.href)
  const [toggled, setToggled] = useState(false)
  const open = inGroup || toggled
  const Icon = item.icon
  const children = item.children ?? []

  if (state === 'collapsed' && !isMobile) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={inGroup}
          tooltip={item.title}
          render={<Link href={children[0]?.href ?? item.href} />}
        >
          <Icon />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton aria-expanded={open} onClick={() => setToggled((v) => !v)}>
        <Icon />
        <span>{item.title}</span>
        <ChevronRight
          className={cn('ml-auto transition-transform duration-200', open && 'rotate-90')}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub>
          {children.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                isActive={isActivePath(pathname, child.href)}
                render={<Link href={child.href} />}
              >
                <span>{child.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

function NavUser({
  user,
  signOutAction,
}: {
  user: SidebarUser
  signOutAction: () => Promise<void>
}) {
  const { isMobile } = useSidebar()
  const initial = user.name.charAt(0) || 'U'

  const identity = (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg bg-primary/10 font-semibold text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>
      <span className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </span>
    </>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            {identity}
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5 font-normal">
                {identity}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem nativeButton render={<button type="submit" className="w-full" />}>
                <LogOut />
                로그아웃
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// 본문 상단 바에 현재 메뉴 이름을 보여준다
export function CurrentNavTitle() {
  const pathname = usePathname()
  const current = navItems.find((item) => isActivePath(pathname, item.href))
  if (!current) return null
  const child = current.children?.find((item) => isActivePath(pathname, item.href))
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {current.title}
      {child && ` / ${child.title}`}
    </span>
  )
}
