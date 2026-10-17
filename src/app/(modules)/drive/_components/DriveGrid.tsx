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
import type { DriveFileItem, DriveFolderItem } from '@/types'

type Props = {
  files: DriveFileItem[]
  folders: DriveFolderItem[]
  sharedFolders?: DriveFolderItem[]
  canWrite: boolean
}

const GRID_CLASS =
  'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{children}</h2>
}

export function DriveGrid({ files, folders, sharedFolders = [], canWrite }: Props) {
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const hasShared = sharedFolders.length > 0
  const isEmpty = folders.length === 0 && files.length === 0

  const emptyState = (
    <EmptyState
      icon={<FolderOpen />}
      title="이 폴더가 비어 있습니다"
      description={canWrite ? '파일을 끌어다 놓거나 업로드해서 시작하세요.' : undefined}
      action={
        canWrite ? (
          <label
            htmlFor={DRIVE_UPLOAD_INPUT_ID}
            className={cn(buttonVariants(), 'cursor-pointer')}
          >
            <Upload data-icon="inline-start" />
            파일 업로드
          </label>
        ) : undefined
      }
    />
  )

  if (isEmpty && !hasShared) return emptyState

  const ownGrid = (
    <div className={GRID_CLASS}>
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
  )

  return (
    <>
      {hasShared ? (
        <div className="space-y-8">
          <section>
            <SectionTitle>내 폴더</SectionTitle>
            {isEmpty ? emptyState : ownGrid}
          </section>
          <section>
            <SectionTitle>공유 폴더</SectionTitle>
            <div className={GRID_CLASS}>
              {sharedFolders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        ownGrid
      )}

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
