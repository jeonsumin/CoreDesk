'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Folder, MoreVertical, Pencil, Shield, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { renameFolder, deleteFolder } from '../_actions/drive'
import { FolderPermissionDialog } from './FolderPermissionDialog'
import type { DriveFolderItem } from '@/types'

type Props = {
  folder: DriveFolderItem
}

function formatDate(d: Date): string {
  const date = new Date(d)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export function FolderCard({ folder }: Props) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [permOpen, setPermOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const itemCount = folder._count.children + folder._count.files

  const isRoot = folder.parentId === null
  const canDelete = isRoot ? folder.canManage : folder.canEdit
  const hasMenu = folder.canManage || folder.canEdit || canDelete

  const handleNavigate = () => {
    router.push(`/drive?folderId=${folder.id}`)
  }

  const handleRename = () => {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await renameFolder(folder.id, newName)
      if (!result.success) {
        setErrorMsg(result.error ?? '이름 변경에 실패했습니다')
        return
      }
      setRenameOpen(false)
    })
  }

  const handleDelete = () => {
    if (!confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?\n폴더가 비어 있어야 삭제할 수 있습니다.`)) return
    startTransition(async () => {
      const result = await deleteFolder(folder.id)
      if (!result.success) {
        alert(result.error ?? '삭제에 실패했습니다')
      }
    })
  }

  return (
    <>
      <div
        onClick={handleNavigate}
        className="group relative flex cursor-pointer flex-col rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-muted/60">
          <Folder className="size-10 fill-amber-400/20 text-amber-400" />
        </div>

        <div className="flex items-start gap-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold" title={folder.name}>
              {folder.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {itemCount > 0 ? `항목 ${itemCount}개` : '비어 있음'} · {formatDate(folder.createdAt)}
            </p>
            {folder.badge && (
              <Badge variant="secondary" className="mt-1.5 max-w-full">
                <span className="truncate">{folder.badge}</span>
              </Badge>
            )}
          </div>
          {hasMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="더보기" title="더보기">
                      <MoreVertical size={14} />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {folder.canManage && (
                    <DropdownMenuItem onClick={() => setPermOpen(true)}>
                      <Shield size={14} />
                      <span>권한 설정</span>
                    </DropdownMenuItem>
                  )}
                  {folder.canEdit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setNewName(folder.name)
                        setErrorMsg(null)
                        setRenameOpen(true)
                      }}
                    >
                      <Pencil size={14} />
                      <span>이름 변경</span>
                    </DropdownMenuItem>
                  )}
                  {canDelete && (folder.canManage || folder.canEdit) && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      <Trash2 size={14} />
                      <span>삭제</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>폴더 이름 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRename()
                }
              }}
              placeholder="폴더 이름"
            />
            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleRename} disabled={isPending}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {folder.canManage && folder.perms && (
        <FolderPermissionDialog
          folderId={folder.id}
          initial={folder.perms}
          open={permOpen}
          onOpenChange={setPermOpen}
        />
      )}
    </>
  )
}
