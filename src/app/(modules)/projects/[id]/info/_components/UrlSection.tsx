'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, LinkIcon } from 'lucide-react'
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
import { createUrl, updateUrl, deleteUrl } from '../_actions/info'
import type { ProjectUrl } from '@/types'

type Props = {
  initialItems: ProjectUrl[]
  projectId: string
  canManage: boolean
}

export function UrlSection({ initialItems, projectId, canManage }: Props) {
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<ProjectUrl | null>(null)
  const [, startTransition] = useTransition()

  const openCreate = () => {
    setEditItem(null)
    setOpen(true)
  }

  const openEdit = (item: ProjectUrl) => {
    setEditItem(item)
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteUrl(id, projectId)
    })
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} />
            URL 추가
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
                <th className="text-left px-3 py-2 whitespace-nowrap">이름</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">IP / Domain</th>
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
                  <td className="px-3 py-2 align-top font-medium">{item.name}</td>
                  <td className="px-3 py-2 align-top">
                    <a
                      href={
                        item.domain.startsWith('http')
                          ? item.domain
                          : `https://${item.domain}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                    >
                      <LinkIcon size={11} className="shrink-0" />
                      {item.domain}
                    </a>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {item.username || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
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
            <DialogTitle>{editItem ? 'URL 수정' : 'URL 추가'}</DialogTitle>
          </DialogHeader>
          <UrlForm
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
        <LinkIcon size={20} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">등록된 URL이 없습니다</p>
        <p className="text-xs text-muted-foreground mt-1">
          프로젝트와 관련된 서비스 URL을 등록해 팀원과 공유하세요.
        </p>
      </div>
      {canManage && (
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} />첫 URL 추가하기
        </Button>
      )}
    </div>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────────

function UrlForm({
  projectId,
  item,
  onSuccess,
}: {
  projectId: string
  item: ProjectUrl | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = item
        ? await updateUrl(item.id, projectId, formData)
        : await createUrl(projectId, formData)
      if (result?.error) setError(result.error)
      else onSuccess()
    })
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url-tags">구분</Label>
        <TagInput name="tags" defaultValue={toStringArray(item?.tags)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="url-name">이름 *</Label>
          <Input
            id="url-name"
            name="name"
            defaultValue={item?.name ?? ''}
            placeholder="예: 관리자 페이지"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url-domain">IP / Domain *</Label>
          <Input
            id="url-domain"
            name="domain"
            defaultValue={item?.domain ?? ''}
            placeholder="예: admin.example.com"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="url-username">ID</Label>
          <Input
            id="url-username"
            name="username"
            defaultValue={item?.username ?? ''}
            placeholder="아이디"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url-password">PW</Label>
          <PasswordInput
            id="url-password"
            name="password"
            defaultValue={item?.password ?? ''}
            placeholder="비밀번호"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url-note">비고</Label>
        <Textarea
          id="url-note"
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
