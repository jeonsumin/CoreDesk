'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toStringArray } from '@/lib/json-array'
import { TagInput } from './TagInput'
import { PwCell, TagChips, PasswordInput } from './InfoCommons'
import { createAccount, updateAccount, deleteAccount } from '../_actions/info'
import type { ProjectAccount } from '@/types'

type Props = {
  initialItems: ProjectAccount[]
  projectId: string
  canManage: boolean
}

export function AccountSection({ initialItems, projectId, canManage }: Props) {
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<ProjectAccount | null>(null)
  const [, startTransition] = useTransition()

  const openCreate = () => {
    setEditItem(null)
    setOpen(true)
  }

  const openEdit = (item: ProjectAccount) => {
    setEditItem(item)
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteAccount(id, projectId)
    })
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} />
            계정 추가
          </Button>
        </div>
      )}

      {initialItems.length === 0 ? (
        <EmptyState canManage={canManage} onAdd={openCreate} />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="text-left px-3 py-2 whitespace-nowrap">구분</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">IP</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">ID</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">PW</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">비고</th>
                {canManage && <th className="px-3 py-2 w-20" />}
              </tr>
            </thead>
            <tbody>
              {initialItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-t hover:bg-muted/20 group transition-colors"
                >
                  <td className="px-3 py-2 align-top">
                    <TagChips tags={toStringArray(item.tags)} />
                  </td>
                  <td className="px-3 py-2 align-top font-mono break-all">
                    {item.ip}
                  </td>
                  <td className="px-3 py-2 align-top">{item.username}</td>
                  <td className="px-3 py-2 align-top">
                    <PwCell value={item.password} />
                  </td>
                  <td className="px-3 py-2 align-top text-muted-foreground whitespace-pre-wrap break-words max-w-xs">
                    {item.note || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="수정"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                          aria-label="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? '계정 수정' : '계정 추가'}</DialogTitle>
          </DialogHeader>
          <AccountForm
            projectId={projectId}
            item={editItem}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  canManage,
  onAdd,
}: {
  canManage: boolean
  onAdd: () => void
}) {
  return (
    <div className="rounded-lg border border-dashed py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
      <div className="rounded-full bg-muted p-3">
        <KeyRound size={20} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">등록된 계정이 없습니다</p>
        <p className="text-xs text-muted-foreground mt-1">
          서버·VM 등 SSH 계정 정보를 등록해 관리하세요.
        </p>
      </div>
      {canManage && (
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} />첫 계정 추가하기
        </Button>
      )}
    </div>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────────

function AccountForm({
  projectId,
  item,
  onSuccess,
}: {
  projectId: string
  item: ProjectAccount | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = item
        ? await updateAccount(item.id, projectId, formData)
        : await createAccount(projectId, formData)
      if (result?.error) setError(result.error)
      else onSuccess()
    })
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="acc-tags">구분</Label>
        <TagInput name="tags" defaultValue={toStringArray(item?.tags)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acc-ip">IP *</Label>
        <Input
          id="acc-ip"
          name="ip"
          defaultValue={item?.ip ?? ''}
          placeholder="예: 10.0.0.1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="acc-username">ID *</Label>
          <Input
            id="acc-username"
            name="username"
            defaultValue={item?.username ?? ''}
            placeholder="아이디"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-password">PW</Label>
          <PasswordInput
            id="acc-password"
            name="password"
            defaultValue={item?.password ?? ''}
            placeholder="비밀번호"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acc-note">비고</Label>
        <Textarea
          id="acc-note"
          name="note"
          defaultValue={item?.note ?? ''}
          rows={3}
          placeholder="메모를 입력하세요"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '저장 중...' : item ? '수정' : '추가'}
      </Button>
    </form>
  )
}
