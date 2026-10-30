import { Client } from 'ssh2'
import { prisma } from '@/lib/prisma'
import { getCurrentDbUser } from '@/lib/admin'
import { decryptSecretField } from '@/lib/field-encryption'
import { canManageProjectInfo } from '@/lib/projects/project-info-security'
import { parseSshEndpoint, type SshEndpoint } from './target'

export type SshAccount = SshEndpoint & {
  id: string
  projectId: string
  username: string
  password: string | null
  label: string
  userId: string
}

// 비밀번호를 클라이언트로 보내지 않기 위해 접속 정보는 항상 accountId로 서버에서 조회한다.
export async function authorizeSshAccount(
  accountId: string,
): Promise<{ account: SshAccount } | { error: string }> {
  const user = await getCurrentDbUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const account = await prisma.projectAccount.findUnique({
    where: { id: accountId },
    include: {
      project: {
        select: { ownerId: true, members: { select: { userId: true, role: true } } },
      },
    },
  })
  if (!account) return { error: '계정 정보를 찾을 수 없습니다' }
  if (!canManageProjectInfo(account.project, user)) return { error: '권한이 없습니다' }

  return {
    account: {
      ...parseSshEndpoint(account.ip),
      id: account.id,
      projectId: account.projectId,
      username: account.username,
      password: decryptSecretField(account.password),
      label: `${account.username}@${account.ip}`,
      userId: user.id,
    },
  }
}

export function connectSsh(account: SshAccount): Promise<Client> {
  return new Promise((resolve, reject) => {
    const client = new Client()
    client
      .once('ready', () => resolve(client))
      .once('error', (err) => reject(err))
      .connect({
        host: account.host,
        port: account.port,
        username: account.username,
        password: account.password ?? undefined,
        readyTimeout: 10_000,
        keepaliveInterval: 30_000,
      })
  })
}

export function sshErrorMessage(err: unknown): string {
  const e = err as { level?: string; code?: string; message?: string }
  if (e.level === 'client-authentication') return '인증 실패: ID/PW를 확인하세요'
  if (e.code === 'ECONNREFUSED') return '접속 거부: 호스트/포트를 확인하세요'
  if (e.code === 'ENOTFOUND') return '호스트를 찾을 수 없습니다'
  return e.message ?? 'SSH 연결 실패'
}
