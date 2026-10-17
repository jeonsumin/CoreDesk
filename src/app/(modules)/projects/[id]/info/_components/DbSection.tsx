'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormActions } from '@/components/form/FormActions'
import { EmptyState as EmptyStateBase } from '@/components/layout/Panel'
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
import { createDb, updateDb, deleteDb } from '../_actions/info'
import type { ProjectDb } from '@/types'

type Props = {
  initialItems: ProjectDb[]
  projectId: string
  canManage: boolean
}

export function DbSection({ initialItems, projectId, canManage }: Props) {
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<ProjectDb | null>(null)
  const [, startTransition] = useTransition()

  const openCreate = () => {
    setEditItem(null)
    setOpen(true)
  }

  const openEdit = (item: ProjectDb) => {
    setEditItem(item)
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteDb(id, projectId)
    })
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            DB 추가
          </Button>
        </div>
      )}

      {initialItems.length === 0 ? (
        <EmptyState canManage={canManage} onAdd={openCreate} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="text-left px-3 py-2 whitespace-nowrap">구분</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">IP</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">ID</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">PW</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">PORT</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">DB명</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">비고</th>
                {canManage && <th className="px-3 py-2 w-20" />}
              </tr>
            </thead>
            <tbody>
              {initialItems.map((item) => (
                <tr
                  key={item.id}
                  className="group border-b transition-colors last:border-b-0 hover:bg-muted/50"
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
                  <td className="px-3 py-2 align-top font-mono">
                    {item.port || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top font-medium">
                    {item.dbName}
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
                          title="수정"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                          aria-label="삭제"
                          title="삭제"
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
            <DialogTitle>{editItem ? 'DB 수정' : 'DB 추가'}</DialogTitle>
          </DialogHeader>
          <DbForm
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
    <EmptyStateBase
      icon={<Database />}
      title="등록된 DB가 없습니다"
      description="DB 접속 정보를 등록해 팀원과 안전하게 공유하세요."
      action={
        canManage && (
          <Button onClick={onAdd}>
            <Plus data-icon="inline-start" />
            첫 DB 추가하기
          </Button>
        )
      }
    />
  )
}

// ─── Form ────────────────────────────────────────────────────────────────────

function DbForm({
  projectId,
  item,
  onSuccess,
}: {
  projectId: string
  item: ProjectDb | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = item
        ? await updateDb(item.id, projectId, formData)
        : await createDb(projectId, formData)
      if (result?.error) setError(result.error)
      else onSuccess()
    })
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label className="font-semibold" htmlFor="db-tags">구분</Label>
        <TagInput name="tags" defaultValue={toStringArray(item?.tags)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="db-ip">IP *</Label>
          <Input
            id="db-ip"
            name="ip"
            defaultValue={item?.ip ?? ''}
            placeholder="예: 10.0.0.10"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="db-port">PORT</Label>
          <Input
            id="db-port"
            name="port"
            defaultValue={item?.port ?? ''}
            placeholder="예: 5432"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="db-username">ID *</Label>
          <Input
            id="db-username"
            name="username"
            defaultValue={item?.username ?? ''}
            placeholder="아이디"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="font-semibold" htmlFor="db-password">PW</Label>
          <PasswordInput
            id="db-password"
            name="password"
            defaultValue={item?.password ?? ''}
            placeholder="비밀번호"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold" htmlFor="db-dbname">DB명 *</Label>
        <Input
          id="db-dbname"
          name="dbName"
          defaultValue={item?.dbName ?? ''}
          placeholder="예: coredesk"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold" htmlFor="db-note">비고</Label>
        <Textarea
          id="db-note"
          name="note"
          defaultValue={item?.note ?? ''}
          rows={3}
          placeholder="메모를 입력하세요"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <FormActions
        isPending={isPending}
        submitLabel={item ? '변경사항 저장' : 'DB 추가'}
      />
    </form>
  )
}
