'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/lib/system/user-schema'
import { cn } from '@/lib/utils'
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

const badgeClass = 'rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap'

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
    <table className="w-full min-w-[720px] text-sm">
      <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur">
        <tr>
          <th className="px-4 py-2.5 font-medium">사용자</th>
          <th className="px-4 py-2.5 font-medium">역할</th>
          <th className="px-4 py-2.5 font-medium">상태</th>
          <th className="px-4 py-2.5 font-medium">가입일</th>
          <th className="px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const isSelf = user.id === currentUserId
          return (
            <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback
                      className={cn(
                        'font-semibold',
                        user.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className={cn('font-medium', !user.isActive && 'text-muted-foreground')}>
                      {user.name}
                      {isSelf && <span className="ml-1.5 text-xs font-normal text-primary">나</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    badgeClass,
                    user.role === 'ADMIN' ? 'border-primary/30 text-primary' : 'text-muted-foreground',
                  )}
                >
                  {ROLE_LABELS[user.role]}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    badgeClass,
                    user.isActive
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {user.isActive ? '활성' : '비활성'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                {user.createdAt.toISOString().slice(0, 10)}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex justify-end gap-1.5">
                  <UserFormDialog mode="edit" user={user} isSelf={isSelf} />
                  {!(isSelf && user.isActive) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => toggleActive(user)}
                      className={cn(user.isActive && 'hover:text-destructive')}
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
  )
}
