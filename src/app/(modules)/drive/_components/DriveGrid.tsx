'use client'

import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { FileCard } from './FileCard'
import { FolderCard } from './FolderCard'
import { PreviewModal } from './PreviewModal'
import type { DriveFileWithUploader, DriveFolderWithCount } from '@/types'

type Props = {
  files: DriveFileWithUploader[]
  folders: DriveFolderWithCount[]
}

export function DriveGrid({ files, folders }: Props) {
  const [previewFile, setPreviewFile] = useState<DriveFileWithUploader | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const isEmpty = folders.length === 0 && files.length === 0

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <FolderOpen size={40} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">이 폴더가 비어 있습니다</p>
        <p className="text-xs text-muted-foreground mt-1">
          &ldquo;파일 업로드&rdquo; 버튼이나 &ldquo;새 폴더&rdquo; 버튼으로 시작하세요.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {folders.map((folder) => (
          <FolderCard key={folder.id} folder={folder} />
        ))}
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onClick={() => {
              setPreviewFile(file)
              setPreviewOpen(true)
            }}
          />
        ))}
      </div>

      <PreviewModal
        file={previewFile}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewFile(null)
        }}
      />
    </>
  )
}
