'use client'

import { useTransition } from 'react'
import { Copy, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { togglePortfolioPublic } from '../_actions/portfolio'

type Props = {
  id: string
  isPublic: boolean
}

export function PortfolioPublicToggle({ id, isPublic }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await togglePortfolioPublic(id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(isPublic ? '비공개로 변경되었습니다' : '공개로 변경되었습니다')
      }
    })
  }

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/portfolio/${id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('공개 URL이 복사되었습니다')
    } catch {
      toast.error('URL 복사에 실패했습니다')
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
          isPublic ? 'border-green-200 bg-green-50 text-green-700' : 'bg-muted text-muted-foreground',
        )}
      >
        {isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
        {isPublic ? '공개' : '비공개'}
      </span>
      <Button type="button" variant="outline" onClick={handleToggle} disabled={isPending}>
        {isPending ? '처리 중...' : isPublic ? '비공개로 전환' : '공개로 전환'}
      </Button>
      {isPublic && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopyUrl}
          disabled={isPending}
          aria-label="공개 URL 복사"
          title={`/portfolio/${id} 공개 URL 복사`}
        >
          <Copy />
        </Button>
      )}
    </div>
  )
}
