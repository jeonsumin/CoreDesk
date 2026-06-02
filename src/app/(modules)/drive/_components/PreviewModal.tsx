'use client'

import { useEffect, useState, useTransition } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatFileSize } from '@/lib/utils'
import { deleteFile } from '../_actions/drive'
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 truncate">{file.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} · {file.mimeType} ·{' '}
            업로더 {file.uploader.name}
          </p>
        </DialogHeader>

        <div className="py-1">{body}</div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 size={14} />
            <span>{isPending ? '삭제 중...' : '삭제'}</span>
          </Button>
          <Button
            render={
              <a
                href={`/api/drive/${file.id}?download=1`}
                download={file.originalName}
              />
            }
          >
            <Download size={14} />
            <span>다운로드</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
