'use client'

import { useState, useTransition } from 'react'
import {
  MoreVertical,
  Pencil,
  Trash2,
  Download,
} from 'lucide-react'
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
import { formatFileSize } from '@/lib/utils'
import { deleteFile, renameFile } from '../_actions/drive'
import { FileTypeIcon } from './FileTypeIcon'
import type { DriveFileItem } from '@/types'

type Props = {
  file: DriveFileItem
  onClick: () => void
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/')
}

function formatDate(d: Date): string {
  const date = new Date(d)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export function FileCard({ file, onClick }: Props) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(file.name)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRename = () => {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await renameFile(file.id, newName)
      if (!result.success) {
        setErrorMsg(result.error ?? '이름 변경에 실패했습니다')
        return
      }
      setRenameOpen(false)
    })
  }

  const handleDelete = () => {
    if (!confirm(`"${file.name}" 파일을 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const result = await deleteFile(file.id)
      if (!result.success) {
        alert(result.error ?? '삭제에 실패했습니다')
      }
    })
  }

  return (
    <>
      <div
        onClick={onClick}
        className="group relative flex cursor-pointer flex-col rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Thumbnail / icon area */}
        <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted/60">
          {isImage(file.mimeType) ? (
            // Unauthenticated <img> sends cookies on same-origin requests, so the
            // auth-gated /api/drive route is reachable. Browsers handle decoding.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/drive/${file.id}`}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <FileTypeIcon mime={file.mimeType} className="size-10" />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex items-start gap-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {formatFileSize(file.size)} · {formatDate(file.createdAt)}
            </p>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="더보기"
                    title="더보기"
                  >
                    <MoreVertical size={14} />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {file.canEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      setNewName(file.name)
                      setErrorMsg(null)
                      setRenameOpen(true)
                    }}
                  >
                    <Pencil size={14} />
                    <span>이름 변경</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  render={
                    <a
                      href={`/api/drive/${file.id}?download=1`}
                      download={file.originalName}
                    />
                  }
                >
                  <Download size={14} />
                  <span>다운로드</span>
                </DropdownMenuItem>
                {file.canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      <Trash2 size={14} />
                      <span>삭제</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>파일 이름 변경</DialogTitle>
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
              placeholder="새 이름"
            />
            {errorMsg && (
              <p className="text-xs text-destructive">{errorMsg}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button onClick={handleRename} disabled={isPending}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
