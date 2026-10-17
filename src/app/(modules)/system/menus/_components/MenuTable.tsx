'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MENU_ICONS } from '@/lib/menu/icons'
import type { IconName } from '@/lib/menu/icon-names'
import type { MenuStatusValue, MenuTypeValue } from '@/lib/menu/menu-schema'
import { cn } from '@/lib/utils'
import { moveMenu } from '../_actions/menu'
import { DeleteMenuDialog } from './DeleteMenuDialog'
import { MenuFormDialog, type GroupOption } from './MenuFormDialog'

export type MenuRow = {
  id: string
  title: string
  type: MenuTypeValue
  path: string | null
  icon: string
  section: string | null
  parentId: string | null
  status: MenuStatusValue
  isSystem: boolean
  level: number
  isFirst: boolean
  isLast: boolean
}

const TYPE_LABELS = { GROUP: '그룹', PAGE: '페이지', LINK: '외부 링크' } as const
const badgeClass = 'rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap'

export function MenuTable({ rows, groups }: { rows: MenuRow[]; groups: GroupOption[] }) {
  const [isPending, startTransition] = useTransition()

  const move = (id: string, direction: 'up' | 'down') => {
    startTransition(async () => {
      const result = await moveMenu(id, direction)
      if ('error' in result) toast.error(result.error)
    })
  }

  return (
    <table className="w-full min-w-[800px] text-sm">
      <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
        <tr>
          <th className="px-4 py-2.5 font-medium">이름</th>
          <th className="px-4 py-2.5 font-medium">유형</th>
          <th className="px-4 py-2.5 font-medium">경로</th>
          <th className="px-4 py-2.5 font-medium">상태</th>
          <th className="px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const Icon = MENU_ICONS[row.icon as IconName]
          return (
            <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2" style={{ paddingLeft: row.level * 24 }}>
                  {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="font-medium">{row.title}</span>
                  {row.section && (
                    <span className="text-xs text-muted-foreground">{row.section}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{TYPE_LABELS[row.type]}</td>
              <td className="max-w-[260px] truncate px-4 py-2.5 text-muted-foreground">
                {row.path ?? '-'}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    badgeClass,
                    row.status === 'ACTIVE'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {row.status === 'ACTIVE' ? '활성' : '준비중'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {row.isSystem ? (
                  <div className="flex justify-end pr-2 text-muted-foreground" title="시스템 메뉴">
                    <Lock className="size-4" aria-label="시스템 메뉴" />
                  </div>
                ) : (
                  <div className="flex justify-end gap-1">
                    <div className="flex w-16 justify-end gap-0.5">
                      {!row.isFirst && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={isPending}
                          aria-label={`${row.title} 위로`}
                          onClick={() => move(row.id, 'up')}
                        >
                          <ArrowUp />
                        </Button>
                      )}
                      {!row.isLast && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={isPending}
                          aria-label={`${row.title} 아래로`}
                          onClick={() => move(row.id, 'down')}
                        >
                          <ArrowDown />
                        </Button>
                      )}
                    </div>
                    <MenuFormDialog mode="edit" menu={row} groups={groups} />
                    <DeleteMenuDialog id={row.id} title={row.title} />
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
