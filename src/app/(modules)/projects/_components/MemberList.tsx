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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { inviteMember, removeMember, updateMemberRole } from '../_actions/member'
import { isProjectMemberRole, type ProjectMemberRole } from '@/lib/project-access'
import type { ProjectMember, User } from '@/types'

type MemberWithUser = ProjectMember & { user: User }

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

  const selectedCandidate = candidates.find((c) => c.id === inviteUserId)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">
          현재 멤버 ({members.length}명)
        </h3>
        <div className="space-y-2">
          {members.map((m) => {
            const isOwnerRow = m.userId === ownerId
            return (
              <div
                key={m.userId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{m.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!m.user.isActive && <Badge variant="secondary">비활성</Badge>}
                  {isOwnerRow ? (
                    <Badge>오너</Badge>
                  ) : canManage ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) => {
                        if (isProjectMemberRole(v) && v !== m.role) {
                          run(() => updateMemberRole(projectId, m.userId, v))
                        }
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue>{roleLabel[m.role]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PM">PM</SelectItem>
                        <SelectItem value="DEVELOPER">개발자</SelectItem>
                        <SelectItem value="VIEWER">열람자</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{roleLabel[m.role]}</Badge>
                  )}
                  {canManage && !isOwnerRow && m.userId !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
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
          <h3 className="text-sm font-medium mb-3">멤버 초대</h3>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              초대할 수 있는 사용자가 없습니다
              {isAdmin && (
                <>
                  {' '}
                  <Link href="/system/users" className="underline">
                    사용자 관리
                  </Link>
                </>
              )}
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={inviteUserId} onValueChange={setInviteUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="사용자 선택">
                    {selectedCandidate &&
                      `${selectedCandidate.name} (${selectedCandidate.email})`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={inviteRole}
                onValueChange={(v) => {
                  if (isProjectMemberRole(v)) setInviteRole(v)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue>{roleLabel[inviteRole]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PM">PM</SelectItem>
                  <SelectItem value="DEVELOPER">개발자</SelectItem>
                  <SelectItem value="VIEWER">열람자</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleInvite} disabled={isPending}>
                초대
              </Button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
