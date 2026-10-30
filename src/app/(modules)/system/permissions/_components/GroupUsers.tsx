'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { EmptyState } from '@/components/layout/Panel'
import { setGroupMember } from '../_actions/permission'

export type GroupUserRow = {
  id: string
  name: string
  email: string
  isActive: boolean
  groupId: string | null
  groupName: string | null
}

export function GroupUsers({ groupId, rows }: { groupId: string; rows: GroupUserRow[] }) {
  const [members, setMembers] = useState(
    () => new Set(rows.filter((r) => r.groupId === groupId).map((r) => r.id)),
  )
  const [, startTransition] = useTransition()

  const toggle = (userId: string, member: boolean) => {
    const before = new Set(members)
    setMembers((s) => {
      const next = new Set(s)
      if (member) next.add(userId)
      else next.delete(userId)
      return next
    })
    startTransition(async () => {
      const result = await setGroupMember(groupId, userId, member)
      if ('error' in result) {
        toast.error(result.error)
        setMembers(before)
      }
    })
  }

  if (rows.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Users />}
          title="권한을 줄 사용자가 없습니다"
          description="사용자관리에서 사용자를 추가하면 이곳에서 권한에 넣을 수 있습니다."
        />
      </div>
    )
  }

  return (
    <div>
      <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">
        사용자는 권한 하나에만 속합니다. 다른 권한에 속한 사용자를 체크하면 이 권한으로 옮겨집니다.
        최고 관리자는 모든 메뉴를 쓸 수 있어 목록에 없습니다.
      </p>
      <table className="w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
          <tr>
            <th className="w-12 px-4 py-2.5 font-medium" />
            <th className="px-4 py-2.5 font-medium">이름</th>
            <th className="px-4 py-2.5 font-medium">이메일</th>
            <th className="px-4 py-2.5 font-medium">현재 권한</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const checked = members.has(u.id)
            const current = checked ? null : u.groupId && u.groupId !== groupId ? u.groupName : null
            return (
              <tr key={u.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(u.id, e.target.checked)}
                    aria-label={`${u.name} 소속`}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </td>
                <td className="px-4 py-2.5 font-medium">
                  {u.name}
                  {!u.isActive && <span className="ml-2 text-xs text-muted-foreground">비활성</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {checked ? '이 권한' : (current ?? '없음')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
