'use client'

import { useState } from 'react'
import { toggleShare, type FolderPerms } from '@/lib/drive/permission-schema'
import type { ShareUserOption } from '@/types'

type Props = {
  value: FolderPerms
  onChange: (v: FolderPerms) => void
  shareUsers: ShareUserOption[]
}

// 루트 폴더 공유 범위: 나만 보기(권한 행 없음) / 공유(사용자별 읽기·쓰기)
export function FolderPermissionFields({ value, onChange, shareUsers }: Props) {
  const [shared, setShared] = useState(value.length > 0)
  const accessOf = (userId: string) => value.find((p) => p.userId === userId)?.access

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="공유 범위" className="flex gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="folder-share"
            checked={!shared}
            onChange={() => {
              setShared(false)
              onChange([])
            }}
            className="accent-primary"
          />
          나만 보기
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="folder-share"
            checked={shared}
            onChange={() => setShared(true)}
            className="accent-primary"
          />
          공유
        </label>
      </div>

      {shared &&
        (shareUsers.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            공유할 사용자가 없습니다.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">사용자</th>
                  <th className="w-14 px-2 py-2 font-medium">읽기</th>
                  <th className="w-14 px-2 py-2 font-medium">쓰기</th>
                </tr>
              </thead>
              <tbody>
                {shareUsers.map((u) => {
                  const access = accessOf(u.id)
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={access !== undefined}
                          onChange={(e) => onChange(toggleShare(value, u.id, 'READ', e.target.checked))}
                          aria-label={`${u.name} 읽기`}
                          className="size-4 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={access === 'WRITE'}
                          onChange={(e) => onChange(toggleShare(value, u.id, 'WRITE', e.target.checked))}
                          aria-label={`${u.name} 쓰기`}
                          className="size-4 cursor-pointer accent-primary"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}
