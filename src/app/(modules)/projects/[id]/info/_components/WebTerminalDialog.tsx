'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { ProjectAccount } from '@/types'

type Props = {
  account: ProjectAccount | null
  onOpenChange: (open: boolean) => void
}

export function WebTerminalDialog({ account, onOpenChange }: Props) {
  return (
    // 바깥 클릭으로 닫히면 SSH 세션이 같이 끊기므로 닫기 버튼으로만 닫는다
    <Dialog open={account !== null} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="h-[80vh] grid-rows-1 overflow-hidden bg-[#0b0d10] p-0 ring-white/10 sm:max-w-5xl"
      >
        {account && <WebTerminal key={account.id} account={account} />}
      </DialogContent>
    </Dialog>
  )
}

type Status = 'connecting' | 'connected' | 'closed'

const STATUS_LABEL: Record<Status, string> = {
  connecting: '연결 중…',
  connected: '연결됨',
  closed: '연결 종료',
}

function WebTerminal({ account }: { account: ProjectAccount }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('connecting')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      theme: { background: '#0b0d10' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current!)
    fit.fit()
    term.focus()

    let sessionId: string | null = null
    let pending = ''
    let sending = false

    // 키 입력은 순서가 중요하므로 요청을 하나씩 보내고, 그 사이 입력은 모아서 다음에 보낸다.
    const flush = async () => {
      if (sending || !sessionId || !pending) return
      sending = true
      const data = pending
      pending = ''
      await fetch(`/api/ssh/shell/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      }).catch(() => {})
      sending = false
      flush()
    }

    const sendSize = () => {
      if (!sessionId) return
      fetch(`/api/ssh/shell/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols: term.cols, rows: term.rows }),
      }).catch(() => {})
    }

    const input = term.onData((data) => {
      pending += data
      flush()
    })
    const resized = term.onResize(sendSize)
    const observer = new ResizeObserver(() => fit.fit())
    observer.observe(containerRef.current!)

    const query = new URLSearchParams({
      accountId: account.id,
      cols: String(term.cols),
      rows: String(term.rows),
    })
    const source = new EventSource(`/api/ssh/shell?${query}`)
    const end = (message: string) => {
      source.close()
      sessionId = null
      setStatus('closed')
      term.write(`\r\n\x1b[90m[${message}]\x1b[0m\r\n`)
    }

    source.addEventListener('ready', (e) => {
      sessionId = (e as MessageEvent<string>).data
      setStatus('connected')
      sendSize()
      flush()
    })
    source.addEventListener('output', (e) => {
      term.write(Uint8Array.from(atob((e as MessageEvent<string>).data), (c) => c.charCodeAt(0)))
    })
    source.addEventListener('failure', (e) => end((e as MessageEvent<string>).data))
    source.addEventListener('exit', () => end('연결이 종료되었습니다'))
    source.onerror = () => end('연결이 끊어졌습니다')

    return () => {
      observer.disconnect()
      resized.dispose()
      input.dispose()
      source.close()
      term.dispose()
    }
  }, [account.id, attempt])

  return (
    <div className="flex min-h-0 min-w-0 flex-col text-neutral-200">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2 text-sm">
        <DialogTitle className="font-mono text-sm font-normal">
          {account.username}@{account.ip}
        </DialogTitle>
        <span
          className={
            status === 'connected'
              ? 'text-emerald-400'
              : status === 'connecting'
                ? 'text-amber-400'
                : 'text-neutral-500'
          }
        >
          ● {STATUS_LABEL[status]}
        </span>
        {status === 'closed' && (
          <button
            onClick={() => {
              setStatus('connecting')
              setAttempt((n) => n + 1)
            }}
            className="rounded border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10"
          >
            다시 연결
          </button>
        )}
        <DialogClose
          className="ml-auto rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-100"
          aria-label="닫기"
        >
          <X size={16} />
        </DialogClose>
      </header>
      <div ref={containerRef} className="min-h-0 flex-1 p-2" />
    </div>
  )
}
