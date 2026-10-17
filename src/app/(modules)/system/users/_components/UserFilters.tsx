'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

// 상태 필터는 페이지 상단 세그먼트 탭이 맡고, 여기서는 검색만 한다
export function UserFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/system/users?${params.toString()}`)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const q = new FormData(e.currentTarget).get('q')
        update('q', typeof q === 'string' ? q.trim() : null)
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        defaultValue={searchParams.get('q') ?? ''}
        placeholder="이름 또는 이메일 검색 (Enter)"
        aria-label="사용자 검색"
        className="h-8 w-64 pl-9"
      />
    </form>
  )
}
