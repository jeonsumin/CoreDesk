'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MENU_ICONS } from '@/lib/menu/icons'
import {
  ACCESS_LABELS,
  PERMISSION_ROLES,
  type MenuAccessValue,
  type MenuTypeValue,
  type PermissionRole,
} from '@/lib/menu/menu-schema'
import { setMenuPermission } from '../_actions/permission'

export type PermissionRow = {
  id: string
  title: string
  type: MenuTypeValue
  section: string | null
  isSystem: boolean
  level: number
  icon: string
  access: Record<PermissionRole, MenuAccessValue>
}

const ROLE_LABELS: Record<PermissionRole, string> = {
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
}

const PAGE_OPTIONS: MenuAccessValue[] = ['NONE', 'READ', 'WRITE']
const LINK_OPTIONS: { value: MenuAccessValue; label: string }[] = [
  { value: 'NONE', label: ACCESS_LABELS.NONE },
  { value: 'READ', label: '표시' },
]

export function PermissionMatrix({ rows }: { rows: PermissionRow[] }) {
  const [isPending, startTransition] = useTransition()

  const change = (menuId: string, role: PermissionRole, value: string | null) => {
    if (!value) return
    startTransition(async () => {
      const result = await setMenuPermission(menuId, role, value)
      if ('error' in result) toast.error(result.error)
    })
  }

  return (
    <table className="w-full min-w-[800px] text-sm">
      <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
        <tr>
          <th className="px-4 py-2.5 font-medium">메뉴</th>
          <th className="px-4 py-2.5 font-medium">ADMIN</th>
          {PERMISSION_ROLES.map((r) => (
            <th key={r} className="px-4 py-2.5 font-medium">
              {ROLE_LABELS[r]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const Icon = MENU_ICONS[row.icon as keyof typeof MENU_ICONS]
          const isGroup = row.type === 'GROUP'
          return (
            <tr
              key={row.id}
              className={
                isGroup
                  ? 'border-b bg-muted/30'
                  : 'border-b transition-colors hover:bg-muted/50'
              }
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2" style={{ paddingLeft: row.level * 24 }}>
                  {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="font-medium">{row.title}</span>
                  {row.section && (
                    <span className="text-xs text-muted-foreground">{row.section}</span>
                  )}
                </div>
              </td>
              {isGroup ? (
                <td colSpan={PERMISSION_ROLES.length + 1} />
              ) : row.isSystem ? (
                <td
                  colSpan={PERMISSION_ROLES.length + 1}
                  className="px-4 py-2.5 text-xs text-muted-foreground"
                >
                  ADMIN 전용
                </td>
              ) : (
                <>
                  <td className="px-4 py-2.5 text-muted-foreground">{ACCESS_LABELS.WRITE}</td>
                  {PERMISSION_ROLES.map((role) => {
                    const isLink = row.type === 'LINK'
                    const current = isLink && row.access[role] === 'WRITE' ? 'READ' : row.access[role]
                    const items = isLink
                      ? LINK_OPTIONS
                      : PAGE_OPTIONS.map((v) => ({ value: v, label: ACCESS_LABELS[v] }))
                    return (
                      <td key={role} className="px-4 py-2">
                        <Select
                          items={items}
                          value={current}
                          onValueChange={(v) => change(row.id, role, v)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-28" aria-label={`${row.title} ${role}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
