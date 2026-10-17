'use client'

import { useEffect, useState, useTransition } from 'react'
import { Download, Loader2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatFileSize } from '@/lib/utils'
import { deleteFile } from '../_actions/drive'
import { FileTypeIcon } from './FileTypeIcon'
import type { DriveFileWithUploader } from '@/types'

type Props = {
  file: DriveFileWithUploader | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'unsupported'

function detectKind(mime: string): PreviewKind {
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('text/')) return 'text'
  return 'unsupported'
}

// Mounted via `key={id}` so initial state is always fresh for a new file.
// The effect only ever fetches; no setState resets needed.
function TextPreview({ id }: { id: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/drive/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('파일을 불러오지 못했습니다')
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (content === null) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>
  }
  return (
    <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 rounded-md p-3 max-h-[60vh] overflow-auto">
      {content}
    </pre>
  )
}

export function PreviewModal({ file, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()

  if (!file) return null

  const kind = detectKind(file.mimeType)
  const src = `/api/drive/${file.id}`

  const handleDelete = () => {
    if (!confirm(`"${file.name}" 파일을 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const result = await deleteFile(file.id)
      if (!result.success) {
        alert(result.error ?? '삭제에 실패했습니다')
        return
      }
      onOpenChange(false)
    })
  }

  const body = (() => {
    switch (kind) {
      case 'image':
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={file.name}
            className="max-w-full max-h-[70vh] mx-auto object-contain rounded-md"
          />
        )
      case 'pdf':
        return (
          <iframe
            src={src}
            title={file.name}
            className="w-full h-[70vh] rounded-md border"
          />
        )
      case 'video':
        return (
          <video
            src={src}
            controls
            className="w-full max-h-[70vh] rounded-md bg-black"
          />
        )
      case 'audio':
        return <audio src={src} controls className="w-full" />
      case 'text':
        return <TextPreview key={file.id} id={file.id} />
      default:
        return (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">미리보기를 지원하지 않는 파일 형식입니다.</p>
            <p className="text-xs mt-1">{file.mimeType}</p>
          </div>
        )
    }
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-3xl">
        <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileTypeIcon mime={file.mimeType} className="size-5 shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold leading-tight">
                {file.name}
              </DialogTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {formatFileSize(file.size)} · {file.mimeType} · 업로더 {file.uploader.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="다운로드"
              title="다운로드"
              render={
                <a
                  href={`/api/drive/${file.id}?download=1`}
                  download={file.originalName}
                />
              }
            >
              <Download />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={isPending ? '삭제 중' : '삭제'}
              title="삭제"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </Button>
            <DialogClose
              render={
                <Button variant="ghost" size="icon-lg" aria-label="닫기" title="닫기" />
              }
            >
              <X />
            </DialogClose>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-auto p-6">{body}</div>
      </DialogContent>
    </Dialog>
  )
}
