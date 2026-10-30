'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MENU_ICONS } from '@/lib/menu/icons'
import type { MenuTypeValue } from '@/lib/menu/menu-schema'
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  togglePermission,
  type MenuPermission,
  type PermissionAction,
} from '@/lib/menu/resolve'
import { setMenuPermission } from '../_actions/permission'

export type GroupMenuRow = {
  id: string
  title: string
  type: MenuTypeValue
  icon: string
  isSystem: boolean
  level: number
  permission: MenuPermission
}

export function GroupMenus({ groupId, rows }: { groupId: string; rows: GroupMenuRow[] }) {
  const [permissions, setPermissions] = useState(
    () => new Map(rows.map((r) => [r.id, r.permission])),
  )
  const [, startTransition] = useTransition()

  const toggle = (menuId: string, action: PermissionAction, checked: boolean) => {
    const before = permissions.get(menuId)!
    const next = togglePermission(before, action, checked)
    setPermissions((m) => new Map(m).set(menuId, next))
    startTransition(async () => {
      const result = await setMenuPermission(groupId, menuId, next)
      if ('error' in result) {
        toast.error(result.error)
        setPermissions((m) => new Map(m).set(menuId, before))
      }
    })
  }

  return (
    <table className="w-full min-w-[640px] text-sm">
      <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
        <tr>
          <th className="px-4 py-2.5 font-medium">메뉴</th>
          {PERMISSION_ACTIONS.map((a) => (
            <th key={a} className="w-20 px-2 py-2.5 text-center font-medium">
              {PERMISSION_ACTION_LABELS[a]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const Icon = MENU_ICONS[row.icon as keyof typeof MENU_ICONS]
          const isGroup = row.type === 'GROUP'
          const permission = permissions.get(row.id)!
          return (
            <tr
              key={row.id}
              className={isGroup ? 'border-b bg-muted/30' : 'border-b transition-colors hover:bg-muted/50'}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2" style={{ paddingLeft: row.level * 24 }}>
                  {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="font-medium">{row.title}</span>
                </div>
              </td>
              {isGroup ? (
                <td colSpan={PERMISSION_ACTIONS.length} />
              ) : row.isSystem ? (
                <td colSpan={PERMISSION_ACTIONS.length} className="px-2 py-2.5 text-center text-xs text-muted-foreground">
                  최고 관리자 전용
                </td>
              ) : (
                PERMISSION_ACTIONS.map((a) => {
                  // 외부 링크는 메뉴에 보이기(읽기)만 설정한다
                  const disabled = row.type === 'LINK' && a !== 'read'
                  return (
                    <td key={a} className="px-2 py-2.5 text-center">
                      {!disabled && (
                        <input
                          type="checkbox"
                          checked={permission[a]}
                          onChange={(e) => toggle(row.id, a, e.target.checked)}
                          aria-label={`${row.title} ${PERMISSION_ACTION_LABELS[a]}`}
                          className="size-4 cursor-pointer accent-primary"
                        />
                      )}
                    </td>
                  )
                })
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
