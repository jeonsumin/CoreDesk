'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { inviteMember, removeMember } from '../_actions/member'
import type { ProjectMember, User } from '@/types'

type MemberWithUser = ProjectMember & { user: User }

type MemberListProps = {
  projectId: string
  members: MemberWithUser[]
  currentUserId: string
  isOwner: boolean
}

const roleLabel: Record<string, string> = {
  PM: 'PM',
  DEVELOPER: '개발자',
  VIEWER: '열람자',
}

export function MemberList({
  projectId,
  members,
  currentUserId,
  isOwner,
}: MemberListProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleInvite = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await inviteMember(projectId, formData)
      if (result?.error) setError(result.error)
    })
  }

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      await removeMember(projectId, userId)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">
          현재 멤버 ({members.length}명)
        </h3>
        <div className="space-y-2">
          {members.map((m) => (
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
                <Badge variant="outline">{roleLabel[m.role]}</Badge>
                {isOwner && m.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemove(m.userId)}
                    disabled={isPending}
                  >
                    제거
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <div>
          <h3 className="text-sm font-medium mb-3">멤버 초대</h3>
          <form action={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <Input
                name="email"
                type="email"
                placeholder="이메일 주소"
                className="flex-1"
              />
              <Select name="role" defaultValue="DEVELOPER">
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PM">PM</SelectItem>
                  <SelectItem value="DEVELOPER">개발자</SelectItem>
                  <SelectItem value="VIEWER">열람자</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isPending}>
                초대
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </div>
      )}
    </div>
  )
}
