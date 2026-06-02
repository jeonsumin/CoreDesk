'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ProjectFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'

  const handleChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all') params.delete('status')
    else params.set('status', value)
    router.push(`/projects?${params.toString()}`)
  }

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="상태 필터" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
        <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
        <SelectItem value="COMPLETED">완료</SelectItem>
        <SelectItem value="ON_HOLD">보류</SelectItem>
        <SelectItem value="CANCELLED">취소</SelectItem>
      </SelectContent>
    </Select>
  )
}
