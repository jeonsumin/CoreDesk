'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState, Panel, PanelHeader } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import { createGroup, deleteGroup, renameGroup } from '../_actions/permission'

type GroupItem = { id: string; name: string; userCount: number }

type Editing = { mode: 'create' } | { mode: 'rename'; group: GroupItem } | { mode: 'delete'; group: GroupItem }

export function GroupList({
  groups,
  selectedId,
  tab,
}: {
  groups: GroupItem[]
  selectedId: string | null
  tab: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const open = (next: Editing) => {
    setName(next.mode === 'create' ? '' : next.group.name)
    setError(null)
    setEditing(next)
  }

  const submit = () =>
    startTransition(async () => {
      if (!editing) return
      if (editing.mode === 'create') {
        const result = await createGroup(name)
        if ('error' in result) {
          setError(result.error)
          return
        }
        router.push(`/system/permissions?group=${result.id}&tab=menus`)
      } else if (editing.mode === 'rename') {
        const result = await renameGroup(editing.group.id, name)
        if ('error' in result) {
          setError(result.error)
          return
        }
      } else {
        const result = await deleteGroup(editing.group.id)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        if (editing.group.id === selectedId) router.push('/system/permissions')
      }
      setEditing(null)
    })

  return (
    <Panel>
      <PanelHeader
        icon={<ShieldCheck />}
        title="권한"
        count={groups.length}
        actions={
          <Button size="icon-sm" variant="ghost" onClick={() => open({ mode: 'create' })} aria-label="권한 추가" title="권한 추가">
            <Plus />
          </Button>
        }
      />

      {groups.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<ShieldCheck />}
            title="등록된 권한이 없습니다"
            description="매니저·멤버처럼 사용자 묶음을 만들고 메뉴 권한을 주세요."
            action={
              <Button onClick={() => open({ mode: 'create' })}>
                <Plus data-icon="inline-start" />
                첫 권한 추가하기
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map((g) => (
            <li key={g.id} className="group/item relative">
              <Link
                href={`/system/permissions?group=${g.id}&tab=${tab}`}
                aria-current={g.id === selectedId ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  g.id === selectedId ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted',
                )}
              >
                <span className="truncate">{g.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground group-hover/item:invisible">
                  {g.userCount}명
                </span>
              </Link>
              <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 gap-0.5 group-hover/item:flex">
                <button
                  onClick={() => open({ mode: 'rename', group: g })}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label={`${g.name} 이름 변경`}
                  title="이름 변경"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => open({ mode: 'delete', group: g })}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                  aria-label={`${g.name} 삭제`}
                  title="삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === 'create' ? '권한 추가' : editing?.mode === 'rename' ? '이름 변경' : '권한 삭제'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-4"
          >
            {editing?.mode === 'delete' ? (
              <p className="text-sm text-muted-foreground">
                &apos;{editing.group.name}&apos; 권한을 삭제합니다. 소속 사용자 {editing.group.userCount}명은 권한이 없어져
                메뉴가 보이지 않게 됩니다.
              </p>
            ) : (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 개발팀"
                aria-label="권한 이름"
                maxLength={30}
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                취소
              </Button>
              <Button type="submit" variant={editing?.mode === 'delete' ? 'destructive' : 'default'} disabled={isPending}>
                {editing?.mode === 'create' ? '추가' : editing?.mode === 'rename' ? '저장' : '삭제'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
