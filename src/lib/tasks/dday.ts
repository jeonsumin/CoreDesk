export type DdayTone = 'danger' | 'warning' | 'neutral'

// CLAUDE.md UX 규칙: 초과는 위험(빨강) + "D+N 초과", D-3 이하는 경고(주황)
export function getDday(dueDate: Date, nowMs: number): { label: string; tone: DdayTone } {
  const diff = Math.ceil((dueDate.getTime() - nowMs) / 86400000)
  if (diff < 0) return { label: `D+${Math.abs(diff)} 초과`, tone: 'danger' }
  return { label: `D-${diff}`, tone: diff <= 3 ? 'warning' : 'neutral' }
}
