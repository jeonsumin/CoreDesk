'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ACCESS_LABELS,
  MENU_ACCESS,
  PERMISSION_ROLES,
  type MenuAccessValue,
  type PermissionRole,
} from '@/lib/menu/menu-schema'
import { ROLE_LABELS } from '@/lib/system/user-schema'
import type { FolderPerms } from '@/lib/drive/permission-schema'

type Props = {
  value: FolderPerms
  onChange: (v: FolderPerms) => void
}

const ACCESS_ITEMS = MENU_ACCESS.map((v) => ({ value: v, label: ACCESS_LABELS[v] }))

const SHARED_DEFAULT: FolderPerms = PERMISSION_ROLES.map((role) => ({ role, access: 'READ' }))

function isMenuAccess(v: string): v is MenuAccessValue {
  return (MENU_ACCESS as readonly string[]).includes(v)
}

// 루트 폴더 공유 범위: 나만 보기(권한 행 없음) / 공유(역할별 숨김·읽기·쓰기)
export function FolderPermissionFields({ value, onChange }: Props) {
  const shared = value.length > 0

  const accessOf = (role: PermissionRole): MenuAccessValue =>
    value.find((p) => p.role === role)?.access ?? 'NONE'

  const changeRole = (role: PermissionRole, v: string | null) => {
    if (!v || !isMenuAccess(v)) return
    onChange(PERMISSION_ROLES.map((r) => ({ role: r, access: r === role ? v : accessOf(r) })))
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="공유 범위" className="flex gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="folder-share"
            checked={!shared}
            onChange={() => onChange([])}
            className="accent-primary"
          />
          나만 보기
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="folder-share"
            checked={shared}
            onChange={() => onChange(SHARED_DEFAULT)}
            className="accent-primary"
          />
          공유
        </label>
      </div>

      {shared && (
        <div className="space-y-2 rounded-lg border p-3">
          {PERMISSION_ROLES.map((role) => (
            <div key={role} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
              <Select
                items={ACCESS_ITEMS}
                value={accessOf(role)}
                onValueChange={(v) => changeRole(role, v)}
              >
                <SelectTrigger className="w-28" aria-label={`${ROLE_LABELS[role]} 권한`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
