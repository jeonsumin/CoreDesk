import { prisma } from '@/lib/prisma'
import { InfoSubTabBar } from './InfoSubTabBar'
import { UrlSection } from './UrlSection'
import { AccountSection } from './AccountSection'
import { DbSection } from './DbSection'
import { decryptProjectInfoItems } from '@/lib/projects/project-info-security'

type Props = {
  projectId: string
  subtab: string
  canManage: boolean
}

const VALID_SUBTABS = new Set(['url', 'account', 'db'])

export async function InfoPanel({ projectId, subtab, canManage }: Props) {
  const activeSubtab = VALID_SUBTABS.has(subtab) ? subtab : 'url'

  const [urls, accounts, dbs] = await Promise.all([
    prisma.projectUrl.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.projectAccount.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.projectDb.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <div className="flex flex-col gap-4">
      <InfoSubTabBar projectId={projectId} activeSubtab={activeSubtab} />

      {activeSubtab === 'url' && (
        <UrlSection
          initialItems={decryptProjectInfoItems(urls)}
          projectId={projectId}
          canManage={canManage}
        />
      )}
      {activeSubtab === 'account' && (
        <AccountSection
          initialItems={decryptProjectInfoItems(accounts)}
          projectId={projectId}
          canManage={canManage}
        />
      )}
      {activeSubtab === 'db' && (
        <DbSection
          initialItems={decryptProjectInfoItems(dbs)}
          projectId={projectId}
          canManage={canManage}
        />
      )}
    </div>
  )
}
