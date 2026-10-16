'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/lib/system/user-schema'
import { setUserActive } from '../_actions/user'
import { UserFormDialog } from './UserFormDialog'
import type { Role } from '@/types'

export type UserRow = {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt: Date
}

export function UserTable({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()

  const toggleActive = (user: UserRow) => {
    startTransition(async () => {
      const result = await setUserActive(user.id, !user.isActive)
      if ('error' in result) toast.error(result.error)
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">이메일</th>
            <th className="px-4 py-3 font-medium">역할</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">가입일</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId
            return (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? 'default' : 'outline'}>
                    {user.isActive ? '활성' : '비활성'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {user.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <UserFormDialog mode="edit" user={user} isSelf={isSelf} />
                    {!(isSelf && user.isActive) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => toggleActive(user)}
                      >
                        {user.isActive ? '비활성화' : '활성화'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
