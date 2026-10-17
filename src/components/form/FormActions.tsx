import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 폼 하단: 구분선 위에 취소 / 주 액션을 우측 정렬
export function FormActions({
  submitLabel,
  pendingLabel = '저장 중...',
  isPending = false,
  cancelHref,
}: {
  submitLabel: string
  pendingLabel?: string
  isPending?: boolean
  cancelHref?: string
}) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      {cancelHref && (
        <Link href={cancelHref} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          취소
        </Link>
      )}
      <Button type="submit" size="lg" disabled={isPending} className="px-4">
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </div>
  )
}
