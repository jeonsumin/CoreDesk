'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FolderPerms } from '@/lib/drive/permission-schema'
import { setFolderPermissions } from '../_actions/drive'
import { FolderPermissionFields } from './FolderPermissionFields'

type Props = {
  folderId: string
  initial: FolderPerms
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FolderPermissionDialog({ folderId, initial, open, onOpenChange }: Props) {
  const [perms, setPerms] = useState<FolderPerms>(initial)
  const [isPending, startTransition] = useTransition()

  // 취소로 닫으면 다음에 열 때 저장된 값부터 보이도록 되돌린다
  const handleOpenChange = (next: boolean) => {
    if (!next && !isPending) setPerms(initial)
    onOpenChange(next)
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await setFolderPermissions(folderId, perms)
      if (!result.success) {
        toast.error(result.error ?? '권한 저장에 실패했습니다')
        return
      }
      toast.success('권한을 저장했습니다')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>권한 설정</DialogTitle>
        </DialogHeader>
        <FolderPermissionFields value={perms} onChange={setPerms} />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
