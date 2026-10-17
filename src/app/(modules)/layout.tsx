import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { getCurrentDbUser } from '@/lib/admin'
import { AppSidebar, CurrentNavTitle } from '@/components/layout/AppSidebar'
import { getCachedMenus } from '@/lib/menu/cache'
import { toSidebarNodes } from '@/lib/menu/sidebar'
import { buildMenuTree, filterVisibleMenus } from '@/lib/menu/resolve'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 비활성화된 사용자는 세션이 남아 있어도 로그아웃시킨다
  const user = await getCurrentDbUser()
  if (!user) redirect('/api/logout')

  // 접힘 상태는 shadcn Sidebar가 sidebar_state 쿠키에 저장한다
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  const menus = toSidebarNodes(filterVisibleMenus(buildMenuTree(await getCachedMenus()), user.role))

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden">
        <AppSidebar
          user={{ name: user.name, email: user.email }}
          menus={menus}
          signOutAction={signOutAction}
        />
        <SidebarInset className="min-w-0 overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 px-4 md:px-6">
            <SidebarTrigger className="-ml-1" aria-label="사이드바 열기/닫기" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <CurrentNavTitle menus={menus} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
