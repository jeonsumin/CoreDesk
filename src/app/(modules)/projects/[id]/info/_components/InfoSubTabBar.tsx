import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  projectId: string
  activeSubtab: string
}

const SUBTABS = [
  { key: 'url', label: 'URL' },
  { key: 'account', label: '계정정보' },
  { key: 'db', label: 'DB정보' },
] as const

export function InfoSubTabBar({ projectId, activeSubtab }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SUBTABS.map((tab) => {
        const isActive = activeSubtab === tab.key
        return (
          <Link
            key={tab.key}
            href={`/projects/${projectId}?tab=info&subtab=${tab.key}`}
            scroll={false}
            className={cn(
              'inline-flex items-center text-sm font-medium rounded-full px-4 py-1.5 transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
