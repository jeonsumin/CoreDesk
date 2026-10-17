'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountBadge } from '@/components/layout/Panel'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { inviteMember, removeMember, updateMemberRole } from '../_actions/member'
import { isProjectMemberRole, type ProjectMemberRole } from '@/lib/project-access'
import { cn } from '@/lib/utils'
import type { ProjectMember, User } from '@/types'

type MemberWithUser = ProjectMember & {
  user: Pick<User, 'id' | 'name' | 'email' | 'isActive'>
}

type MemberListProps = {
  projectId: string
  ownerId: string
  members: MemberWithUser[]
  candidates: Pick<User, 'id' | 'name' | 'email'>[]
  currentUserId: string
  canManage: boolean
  isAdmin: boolean
}

const roleLabel: Record<ProjectMemberRole, string> = {
  PM: 'PM',
  DEVELOPER: '개발자',
  VIEWER: '열람자',
}

const roleItems = (Object.keys(roleLabel) as ProjectMemberRole[]).map((value) => ({
  value,
  label: roleLabel[value],
}))

const badgeClass = 'rounded-md border px-2 py-0.5 text-xs font-semibold'

export function MemberList({
  projectId,
  ownerId,
  members,
  candidates,
  currentUserId,
  canManage,
  isAdmin,
}: MemberListProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [inviteUserId, setInviteUserId] = useState<string | null>(null)
  const [inviteRole, setInviteRole] = useState<ProjectMemberRole>('DEVELOPER')

  const run = (action: () => Promise<{ ok: true } | { error: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if ('error' in result) setError(result.error)
    })
  }

  const handleInvite = () => {
    if (!inviteUserId) {
      setError('초대할 사용자를 선택하세요')
      return
    }
    run(async () => {
      const result = await inviteMember(projectId, inviteUserId, inviteRole)
      if ('ok' in result) setInviteUserId(null)
      return result
    })
  }

  const candidateItems = candidates.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.email})`,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          현재 멤버
          <CountBadge>{members.length}</CountBadge>
        </h3>
        <div className="border-t">
          {members.map((m) => {
            const isOwnerRow = m.userId === ownerId
            return (
              <div
                key={m.userId}
                className="flex min-h-14 items-center justify-between gap-3 border-b px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={cn(
                        m.user.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {m.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        !m.user.isActive && 'text-muted-foreground',
                      )}
                    >
                      {m.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!m.user.isActive && (
                    <span className={cn(badgeClass, 'bg-muted text-muted-foreground')}>
                      비활성
                    </span>
                  )}
                  {isOwnerRow ? (
                    <span className={cn(badgeClass, 'border-primary/30 text-primary')}>
                      오너
                    </span>
                  ) : canManage ? (
                    <Select
                      items={roleItems}
                      value={m.role}
                      onValueChange={(v) => {
                        if (isProjectMemberRole(v) && v !== m.role) {
                          run(() => updateMemberRole(projectId, m.userId, v))
                        }
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-28" aria-label={`${m.user.name} 역할`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn(badgeClass, 'text-muted-foreground')}>
                      {roleLabel[m.role]}
                    </span>
                  )}
                  {canManage && !isOwnerRow && m.userId !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => run(() => removeMember(projectId, m.userId))}
                      disabled={isPending}
                    >
                      제거
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {canManage && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">멤버 초대</h3>
          {candidates.length === 0 ? (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              초대할 수 있는 사용자가 없습니다.
              {isAdmin && (
                <>
                  {' '}
                  <Link href="/system/users" className="font-medium text-primary hover:underline">
                    사용자관리에서 계정 만들기
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Select items={candidateItems} value={inviteUserId} onValueChange={setInviteUserId}>
                <SelectTrigger className="h-9 flex-1" aria-label="초대할 사용자">
                  <SelectValue placeholder="사용자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {candidateItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                items={roleItems}
                value={inviteRole}
                onValueChange={(v) => {
                  if (isProjectMemberRole(v)) setInviteRole(v)
                }}
              >
                <SelectTrigger className="h-9 w-28" aria-label="역할">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="lg" onClick={handleInvite} disabled={isPending}>
                멤버 초대
              </Button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
