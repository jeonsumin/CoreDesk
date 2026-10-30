'use client'

import { useState } from 'react'
import { Plus, X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { buildForwardCommand, type ForwardRow } from '@/lib/ssh/target'
import type { ProjectAccount } from '@/types'

type Props = {
  account: ProjectAccount | null
  onOpenChange: (open: boolean) => void
}

export function PortForwardDialog({ account, onOpenChange }: Props) {
  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>포트 포워딩</DialogTitle>
        </DialogHeader>
        {account && <PortForwardBody key={account.id} account={account} />}
      </DialogContent>
    </Dialog>
  )
}

const EMPTY_ROW: ForwardRow = { localPort: '', remoteHost: '', remotePort: '' }

function PortForwardBody({ account }: { account: ProjectAccount }) {
  const [rows, setRows] = useState<ForwardRow[]>([EMPTY_ROW])
  const [copied, setCopied] = useState(false)
  const command = buildForwardCommand(account.username, account.ip, rows)

  const update = (index: number, patch: Partial<ForwardRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setCopied(false)
  }

  const copy = async () => {
    if (!command) return
    await navigator.clipboard.writeText(command)
    setCopied(true)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        연결할 포트를 입력하고 명령을 복사해 내 PC 터미널에서 실행하세요. 실행 중인 동안 내 PC의
        로컬 포트가 원격 포트로 연결됩니다.
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1.4fr_1fr_2rem] gap-2 text-xs font-medium text-muted-foreground">
          <span>로컬 포트</span>
          <span>원격 호스트</span>
          <span>원격 포트</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.4fr_1fr_2rem] items-center gap-2">
            <Input
              aria-label="로컬 포트"
              inputMode="numeric"
              placeholder="15432"
              value={row.localPort}
              onChange={(e) => update(i, { localPort: e.target.value })}
            />
            <Input
              aria-label="원격 호스트"
              placeholder="127.0.0.1"
              value={row.remoteHost}
              onChange={(e) => update(i, { remoteHost: e.target.value })}
            />
            <Input
              aria-label="원격 포트"
              inputMode="numeric"
              placeholder="5432"
              value={row.remotePort}
              onChange={(e) => update(i, { remotePort: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setRows((prev) => (prev.length === 1 ? [EMPTY_ROW] : prev.filter((_, j) => j !== i)))}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              aria-label="포트 삭제"
              title="포트 삭제"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((prev) => [...prev, EMPTY_ROW])}
        >
          <Plus data-icon="inline-start" />
          포트 추가
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">실행할 명령</h3>
        {command ? (
          <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{command}</code>
            <button
              type="button"
              onClick={copy}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="명령 복사"
              title="명령 복사"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        ) : (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            로컬 포트와 원격 포트를 입력하면 명령이 만들어집니다.
          </p>
        )}
      </div>
    </div>
  )
}
