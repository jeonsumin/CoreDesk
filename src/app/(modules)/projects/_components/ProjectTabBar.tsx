import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = { key: string; label: string }

type Props = {
  projectId: string
  activeTab: string
  tabs: Tab[]
}

export function ProjectTabBar({ projectId, activeTab, tabs }: Props) {
  return (
    <div className="flex border-b shrink-0">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/projects/${projectId}?tab=${tab.key}`}
          className={cn(
            'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
            activeTab === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
