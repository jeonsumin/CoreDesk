import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { authorizeSshAccount, connectSsh, sshErrorMessage } from '@/lib/ssh/connect'
import { shellSessions } from '@/lib/ssh/shells'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const clampSize = (raw: string | null, fallback: number) =>
  Math.min(Math.max(Number(raw) || fallback, 2), 500)

// SSE 스트림 하나가 SSH 셸 하나의 수명이다. 탭을 닫으면(abort) 연결도 끊는다.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const auth = await authorizeSshAccount(params.get('accountId') ?? '')
  if ('error' in auth) return new Response(auth.error, { status: 403 })
  const { account } = auth

  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: string, data: string) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }
      const finish = () => {
        if (closed) return
        closed = true
        controller.close()
      }

      try {
        const client = await connectSsh(account)
        const sessionId = randomUUID()
        const cleanup = () => {
          shellSessions.delete(sessionId)
          client.end()
          finish()
        }
        const exit = () => {
          send('exit', '')
          cleanup()
        }
        req.signal.addEventListener('abort', cleanup)
        client.on('close', exit)

        client.shell(
          { term: 'xterm-256color', cols: clampSize(params.get('cols'), 80), rows: clampSize(params.get('rows'), 24) },
          (err, stream) => {
            if (err) {
              send('failure', sshErrorMessage(err))
              return cleanup()
            }
            shellSessions.set(sessionId, { userId: account.userId, stream })
            stream.on('data', (chunk: Buffer) => send('output', chunk.toString('base64')))
            stream.stderr.on('data', (chunk: Buffer) => send('output', chunk.toString('base64')))
            stream.on('close', exit)
            send('ready', sessionId)
          },
        )
      } catch (err) {
        send('failure', sshErrorMessage(err))
        finish()
      }
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
