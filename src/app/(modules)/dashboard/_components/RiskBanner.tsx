import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { Project, Task } from '@/types'

type Props = {
  riskProjects: (Project & { tasks: Task[] })[]
  nowMs: number
}

export function RiskBanner({ riskProjects, nowMs }: Props) {
  if (riskProjects.length === 0) return null

  return (
    <div className="shrink-0 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              마감 리스크 <span className="text-orange-600 tabular-nums">{riskProjects.length}건</span>
            </p>
            <p className="text-xs text-muted-foreground">D-7 이하 · 진행률 50% 미만</p>
          </div>
        </div>
        <span className="rounded-md border border-orange-200 bg-card px-2 py-0.5 text-xs font-semibold text-orange-600">
          주의
        </span>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {riskProjects.map((p) => {
          const total = p.tasks.length
          const done = p.tasks.filter((t) => t.status === 'DONE').length
          const progress = total > 0 ? Math.round((done / total) * 100) : 0
          const daysLeft = p.endDate
            ? Math.ceil((new Date(p.endDate).getTime() - nowMs) / 86400000)
            : null

          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-card px-3 py-2 text-sm transition-colors hover:bg-orange-100/50"
            >
              <span className="min-w-0 truncate font-medium">
                {p.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                  {progress}%
                </span>
              </span>
              <span
                className={
                  daysLeft !== null && daysLeft < 0
                    ? 'flex shrink-0 items-center gap-1 text-xs font-semibold text-red-600'
                    : 'flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-600'
                }
              >
                {daysLeft !== null &&
                  (daysLeft < 0 ? `D+${Math.abs(daysLeft)} 초과` : `D-${daysLeft}`)}
                <ArrowRight className="size-3" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
