import type { ReactNode } from 'react'

type Props = {
  title: string
  tabs?: ReactNode
  actions?: ReactNode
}

// 모든 모듈 페이지 최상단: 큰 제목 + 세그먼트 탭 + 우측 액션
export function PageHeader({ title, tabs, actions }: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-6">
        <h1 className="whitespace-nowrap text-3xl font-bold text-foreground">{title}</h1>
        {tabs}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
