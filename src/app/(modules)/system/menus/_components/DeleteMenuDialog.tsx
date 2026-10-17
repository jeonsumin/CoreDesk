'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteMenu } from '../_actions/menu'

export function DeleteMenuDialog({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteMenu(id)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      setOpen(false)
      toast.success('메뉴를 삭제했습니다')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${title} 삭제`}
            title="메뉴 삭제"
            className="hover:text-destructive"
          >
            <Trash2 />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>메뉴 삭제</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          「{title}」 메뉴를 삭제할까요? 권한 설정도 함께 삭제됩니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={onDelete}>
            {isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
