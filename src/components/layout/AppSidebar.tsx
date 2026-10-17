'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createElement, useState } from 'react'
import { ChevronRight, ChevronsUpDown, Folder, LogOut } from 'lucide-react'
import { MENU_ICONS } from '@/lib/menu/icons'
import type { IconName } from '@/lib/menu/icon-names'
import type { SidebarNode as MenuTreeNode } from '@/lib/menu/sidebar'
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

const NodeIcon = ({ node }: { node: MenuTreeNode }) =>
  createElement(MENU_ICONS[node.icon as IconName] ?? Folder)

// 루트 메뉴를 section 별로 묶는다. 첫 등장 순서를 유지하고 section 이 없으면 라벨 없는 그룹이 된다
function groupBySection(menus: MenuTreeNode[]) {
  const groups = new Map<string | null, MenuTreeNode[]>()
  for (const m of menus) {
    const key = m.section ?? null
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  return [...groups.entries()]
}

const childPaths = (node: MenuTreeNode) =>
  node.children.flatMap((c) => (c.type === 'PAGE' && c.path ? [c.path] : []))

const PreparingBadge = () => (
  <span className="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
    예정
  </span>
)

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppSidebar({
  user,
  menus,
  signOutAction,
}: {
  user: SidebarUser
  menus: MenuTreeNode[]
  signOutAction: () => Promise<void>
}) {
  const pathname = usePathname()

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
        {groupBySection(menus).map(([section, items]) => (
          <SidebarGroup key={section ?? 'none'}>
            {section && (
              /* 아이콘 모드에서 숨은 라벨이 위 그룹의 마지막 메뉴를 덮어 클릭을 가로채지 않게 한다 */
              <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
                {section}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {items.map((item) =>
                item.type === 'GROUP' ? (
                  <NavItemWithChildren key={item.id} item={item} pathname={pathname} />
                ) : (
                  <NavLeaf key={item.id} item={item} pathname={pathname} />
                ),
              )}
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

function NavLeaf({ item, pathname }: { item: MenuTreeNode; pathname: string }) {
  const preparing = item.status === 'PREPARING'
  const href = item.path ?? '#'
  const render =
    item.type === 'LINK' && !preparing ? (
      <a href={href} target="_blank" rel="noopener noreferrer" />
    ) : (
      <Link href={preparing ? '#' : href} />
    )
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={
          item.type === 'PAGE' && !preparing && !!item.path && isActivePath(pathname, item.path)
        }
        tooltip={item.title}
        disabled={preparing}
        render={render}
      >
        <NodeIcon node={item} />
        <span>{item.title}</span>
        {preparing && <PreparingBadge />}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// 하위 메뉴가 있는 항목 (시스템관리 > 사용자관리). 아이콘 모드에서는 첫 하위 메뉴로 바로 이동한다
function NavItemWithChildren({ item, pathname }: { item: MenuTreeNode; pathname: string }) {
  const { state, isMobile } = useSidebar()
  const inGroup = childPaths(item).some((p) => isActivePath(pathname, p))
  const [toggled, setToggled] = useState(false)
  const open = inGroup || toggled
  const children = item.children

  if (state === 'collapsed' && !isMobile) {
    const target = children.find((c) => c.type === 'PAGE' && c.status !== 'PREPARING' && c.path)
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={inGroup}
          tooltip={target ? item.title : `${item.title} (예정)`}
          disabled={!target}
          render={<Link href={target?.path ?? '#'} tabIndex={target ? undefined : -1} />}
        >
          <NodeIcon node={item} />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton aria-expanded={open} onClick={() => setToggled((v) => !v)}>
        <NodeIcon node={item} />
        <span>{item.title}</span>
        <ChevronRight
          className={cn('ml-auto transition-transform duration-200', open && 'rotate-90')}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub>
          {children.map((child) => {
            const preparing = child.status === 'PREPARING'
            const href = child.path ?? '#'
            return (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  isActive={!preparing && !!child.path && isActivePath(pathname, child.path)}
                  aria-disabled={preparing || undefined}
                  className={preparing ? 'pointer-events-none opacity-50' : undefined}
                  render={
                    child.type === 'LINK' && !preparing ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" />
                    ) : (
                      <Link href={preparing ? '#' : href} tabIndex={preparing ? -1 : undefined} />
                    )
                  }
                >
                  <span>{child.title}</span>
                  {preparing && <PreparingBadge />}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
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
export function CurrentNavTitle({ menus }: { menus: MenuTreeNode[] }) {
  const pathname = usePathname()
  const hit = (n: MenuTreeNode) => n.type === 'PAGE' && !!n.path && isActivePath(pathname, n.path)
  const group = menus.find((m) => hit(m) || m.children.some(hit))
  if (!group) return null
  const child = group.children.find(hit)
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {group.title}
      {child && ` / ${child.title}`}
    </span>
  )
}
