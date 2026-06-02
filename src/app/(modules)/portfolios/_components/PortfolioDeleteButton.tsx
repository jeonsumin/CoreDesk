'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deletePortfolio } from '../_actions/portfolio'

type Props = {
  id: string
}

export function PortfolioDeleteButton({ id }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('포트폴리오를 삭제하시겠습니까?')) return
    startTransition(async () => {
      const result = await deletePortfolio(id)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 size={14} />
      <span>{isPending ? '삭제 중...' : '삭제'}</span>
    </Button>
  )
}
