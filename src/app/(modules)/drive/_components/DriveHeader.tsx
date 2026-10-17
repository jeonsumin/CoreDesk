'use client'

import { useRef, useState, useTransition, type DragEvent } from 'react'
import { Upload, Loader2, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import type { FolderPerms } from '@/lib/drive/permission-schema'
import { uploadFile, createFolder } from '../_actions/drive'
import { FolderPermissionFields } from './FolderPermissionFields'

// 빈 폴더 안내의 업로드 버튼(label)이 이 input을 연다
export const DRIVE_UPLOAD_INPUT_ID = 'drive-upload-input'

type Props = {
  folderId: string | null
  canWrite: boolean
}

export function DriveHeader({ folderId, canWrite }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, startUpload] = useTransition()
  const [isCreating, startCreate] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderError, setFolderError] = useState<string | null>(null)
  const [folderPerms, setFolderPerms] = useState<FolderPerms>([])
  const dragCounter = useRef(0)

  const isPending = isUploading || isCreating

  // ─── Upload ───────────────────────────────────────────────────────────────

  const uploadFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return
    setErrorMsg(null)
    startUpload(async () => {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        if (folderId) formData.append('folderId', folderId)
        const result = await uploadFile(formData)
        if (!result.success) {
          setErrorMsg(`${file.name} 업로드 실패: ${result.error ?? '알 수 없는 오류'}`)
        }
      }
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    uploadFiles(e.target.files)
    e.target.value = ''
  }

  // ─── Drag & drop ─────────────────────────────────────────────────────────

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
  }

  // ─── Create folder ────────────────────────────────────────────────────────

  const openNewFolder = () => {
    setFolderName('')
    setFolderError(null)
    setFolderPerms([])
    setNewFolderOpen(true)
  }

  const handleCreateFolder = () => {
    setFolderError(null)
    startCreate(async () => {
      const result = await createFolder(folderName, folderId, folderId ? undefined : folderPerms)
      if (!result.success) {
        setFolderError(result.error ?? '폴더 생성에 실패했습니다')
        return
      }
      setNewFolderOpen(false)
    })
  }

  if (!canWrite) {
    return (
      <div className="shrink-0">
        <PageHeader title="드라이브" />
      </div>
    )
  }

  return (
    <>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative shrink-0"
      >
        <PageHeader
          title="드라이브"
          actions={
            <>
              <input
                id={DRIVE_UPLOAD_INPUT_ID}
                ref={inputRef}
                type="file"
                multiple
                onChange={handleInputChange}
                className="hidden"
                aria-hidden="true"
              />
              <Button variant="outline" size="lg" onClick={openNewFolder} disabled={isPending}>
                <FolderPlus data-icon="inline-start" />
                새 폴더
              </Button>
              <Button
                size="lg"
                onClick={() => !isPending && inputRef.current?.click()}
                disabled={isPending}
              >
                {isUploading ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload data-icon="inline-start" />
                    파일 업로드
                  </>
                )}
              </Button>
            </>
          }
        />

        {errorMsg && <p className="mt-2 text-xs text-destructive">{errorMsg}</p>}

        {isDragging && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-primary/5 backdrop-blur-sm">
            <div className="rounded-xl border-2 border-dashed border-primary bg-background/95 px-10 py-8 shadow-lg">
              <Upload size={32} className="mx-auto text-primary mb-2" />
              <p className="text-sm font-medium text-center">여기에 파일을 놓으면 업로드됩니다</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 폴더</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              placeholder="폴더 이름"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateFolder()
                }
              }}
            />
            {folderError && <p className="text-xs text-destructive">{folderError}</p>}
          </div>
          {folderId ? (
            <p className="text-xs text-muted-foreground">상위 폴더 권한을 따릅니다</p>
          ) : (
            <FolderPermissionFields value={folderPerms} onChange={setFolderPerms} />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewFolderOpen(false)}
              disabled={isCreating}
            >
              취소
            </Button>
            <Button onClick={handleCreateFolder} disabled={isCreating}>
              {isCreating ? '생성 중...' : '폴더 만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
