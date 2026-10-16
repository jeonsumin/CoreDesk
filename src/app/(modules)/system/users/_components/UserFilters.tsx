'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function UserFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'active'

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/system/users?${params.toString()}`)
  }

  return (
    <div className="flex gap-2">
      <Input
        key={searchParams.get('q') ?? ''}
        defaultValue={searchParams.get('q') ?? ''}
        placeholder="이름 또는 이메일 검색"
        className="max-w-xs"
        onChange={(e) => update('q', e.target.value.trim())}
      />
      <Select value={status} onValueChange={(v) => update('status', v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">활성</SelectItem>
          <SelectItem value="inactive">비활성</SelectItem>
          <SelectItem value="all">전체</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
