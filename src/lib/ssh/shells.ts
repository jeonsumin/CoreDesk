import type { ClientChannel } from 'ssh2'

type ShellSession = { userId: string; stream: ClientChannel }

// ponytail: 프로세스 메모리 보관 (k8s replicas: 1 전제). 다중 레플리카면 sticky session 필요.
const globalForShells = globalThis as unknown as { sshShells?: Map<string, ShellSession> }
export const shellSessions = (globalForShells.sshShells ??= new Map())
