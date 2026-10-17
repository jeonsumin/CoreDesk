'use client'

import { useState } from 'react'
import { FolderOpen, Upload } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/layout/Panel'
import { cn } from '@/lib/utils'
import { DRIVE_UPLOAD_INPUT_ID } from './DriveHeader'
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
      <EmptyState
        icon={<FolderOpen />}
        title="이 폴더가 비어 있습니다"
        description="파일을 끌어다 놓거나 업로드해서 시작하세요."
        action={
          <label
            htmlFor={DRIVE_UPLOAD_INPUT_ID}
            className={cn(buttonVariants(), 'cursor-pointer')}
          >
            <Upload data-icon="inline-start" />
            파일 업로드
          </label>
        }
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
