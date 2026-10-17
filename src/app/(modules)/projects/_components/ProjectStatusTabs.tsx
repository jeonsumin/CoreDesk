'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { SegmentedTabs } from '@/components/layout/SegmentedTabs'

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'IN_PROGRESS', label: '진행 중' },
  { key: 'COMPLETED', label: '완료' },
  { key: 'ON_HOLD', label: '보류' },
  { key: 'CANCELLED', label: '취소' },
]

// 상태 필터는 URL ?status= 로 유지한다. 상세 화면에서도 좌측 목록만 걸러진다
export function ProjectStatusTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('status') ?? 'all'

  const items = STATUS_TABS.map((tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab.key === 'all') params.delete('status')
    else params.set('status', tab.key)
    const query = params.toString()
    return { ...tab, href: query ? `${pathname}?${query}` : pathname }
  })

  return <SegmentedTabs items={items} activeKey={active} />
}
