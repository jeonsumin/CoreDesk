'use client'

import { useTransition } from 'react'
import { Copy, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <div className="flex items-center gap-2">
      {isPublic && (
        <Badge variant="secondary" className="gap-1">
          <Globe size={12} />
          공개
        </Badge>
      )}
      <Button
        type="button"
        variant={isPublic ? 'outline' : 'secondary'}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPublic ? <Lock size={14} /> : <Globe size={14} />}
        <span>{isPending ? '처리 중...' : isPublic ? '비공개로 전환' : '공개로 전환'}</span>
      </Button>
      {isPublic && (
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyUrl}
          disabled={isPending}
          title={`/portfolio/${id} 공개 URL 복사`}
        >
          <Copy size={14} />
          URL 복사
        </Button>
      )}
    </div>
  )
}
