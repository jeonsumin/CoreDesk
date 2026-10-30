export type SshEndpoint = { host: string; port: number }

// 계정의 IP 칸에 "10.0.0.1" 또는 "10.0.0.1:2222" 형태로 저장된다. IPv6는 포트 없이 그대로 쓴다.
export function parseSshEndpoint(raw: string): SshEndpoint {
  const value = raw.trim()
  const match = /^([^:]+):(\d{1,5})$/.exec(value)
  if (match) {
    const port = Number(match[2])
    if (port >= 1 && port <= 65535) return { host: match[1], port }
  }
  return { host: value, port: 22 }
}

export type ForwardRow = { localPort: string; remoteHost: string; remotePort: string }

const isPort = (v: string) => /^\d{1,5}$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 65535

// 사용자 PC에서 실행할 `ssh -N -L ...` 명령. 완성되지 않은 행은 건너뛴다.
export function buildForwardCommand(username: string, ip: string, rows: ForwardRow[]): string | null {
  const forwards = rows
    .filter((r) => isPort(r.localPort) && isPort(r.remotePort))
    .map((r) => {
      const host = r.remoteHost.trim() || '127.0.0.1'
      return `-L ${r.localPort.trim()}:${host.includes(':') ? `[${host}]` : host}:${r.remotePort.trim()}`
    })
  if (forwards.length === 0) return null

  const { host, port } = parseSshEndpoint(ip)
  return ['ssh -N', port !== 22 && `-p ${port}`, ...forwards, `${username}@${host}`]
    .filter(Boolean)
    .join(' ')
}
