import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Panel, PanelHeader } from './Panel'

// 생성/수정 페이지: 우측 패널 안에 다이얼로그처럼 좁은 폼 칼럼을 둔다
export function FormPanel({
  icon,
  title,
  description,
  wide = false,
  children,
}: {
  icon?: ReactNode
  title: string
  description?: string
  // 에디터처럼 넓은 입력이 필요한 폼만 true
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Panel className="flex-1">
      <PanelHeader icon={icon} title={title} />
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className={cn('mx-auto space-y-8', wide ? 'max-w-4xl' : 'max-w-2xl')}>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
    </Panel>
  )
}

// FormPanel 안에서 폼을 주제별로 나눌 때 쓰는 소제목 블록
export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}
