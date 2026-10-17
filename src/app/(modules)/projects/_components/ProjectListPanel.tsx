'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Info,
  KanbanSquare,
  NotepadText,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CountBadge } from '@/components/layout/Panel'
import { projectColor, projectStatusLabel } from '@/lib/projects/appearance'
import { cn } from '@/lib/utils'

type ProjectItem = {
  id: string
  name: string
  status: string
  memberCount: number
  canManage: boolean
}

export function ProjectListPanel({ projects }: { projects: ProjectItem[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')

  const status = searchParams.get('status')
  const activeId = pathname.match(/^\/projects\/([^/]+)/)?.[1]
  const visible = projects.filter(
    (p) =>
      (!status || p.status === status || p.id === activeId) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:flex">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">프로젝트</h2>
          <CountBadge>{visible.length}</CountBadge>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프로젝트 검색..."
            aria-label="프로젝트 검색"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            {query ? '검색 결과가 없습니다.' : '이 상태의 프로젝트가 없습니다.'}
            <Link
              href="/projects/new"
              className="mt-3 block font-medium text-primary hover:underline"
            >
              새 프로젝트 만들기
            </Link>
          </div>
        ) : (
          visible.map((project) => {
            const active = project.id === activeId
            return (
              <div key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    active ? 'bg-sidebar-accent' : 'hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
                      projectColor(project.id),
                    )}
                  >
                    {project.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm font-semibold',
                        active && 'text-primary',
                      )}
                    >
                      {project.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {projectStatusLabel[project.status]}
                      <Users className="size-3" />
                      {project.memberCount}
                    </span>
                  </span>
                  {active ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </Link>
                {active && (
                  <ProjectSubNav
                    projectId={project.id}
                    canManage={project.canManage}
                    pathname={pathname}
                    tab={searchParams.get('tab')}
                  />
                )}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}

function ProjectSubNav({
  projectId,
  canManage,
  pathname,
  tab,
}: {
  projectId: string
  canManage: boolean
  pathname: string
  tab: string | null
}) {
  const base = `/projects/${projectId}`
  const onDetail = pathname === base
  const activeTab = onDetail
    ? tab ?? 'board'
    : pathname.startsWith(`${base}/memos/`)
      ? 'memos'
      : null

  const items = [
    { key: 'board', label: '보드', icon: KanbanSquare, href: `${base}?tab=board` },
    { key: 'timeline', label: '타임라인', icon: CalendarRange, href: `${base}?tab=timeline` },
    { key: 'info', label: '정보', icon: Info, href: `${base}?tab=info` },
    { key: 'memos', label: '메모', icon: NotepadText, href: `${base}?tab=memos` },
    ...(canManage
      ? [
          { key: 'members', label: '멤버 관리', icon: Users, href: `${base}?tab=members` },
          { key: 'settings', label: '설정', icon: Settings, href: `${base}/settings` },
        ]
      : []),
  ]

  return (
    <nav className="mt-1 mb-2 ml-5 space-y-0.5 border-l pl-3">
      {items.map((item) => {
        const Icon = item.icon
        const active =
          item.key === 'settings'
            ? pathname === `${base}/settings`
            : activeTab === item.key
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
              active
                ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
