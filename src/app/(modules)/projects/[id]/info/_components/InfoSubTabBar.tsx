import { SegmentedTabs } from '@/components/layout/SegmentedTabs'

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
    <SegmentedTabs
      size="sm"
      activeKey={activeSubtab}
      items={SUBTABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        href: `/projects/${projectId}?tab=info&subtab=${tab.key}`,
      }))}
    />
  )
}
