import { z } from 'zod'
import { getCurrentDbUser } from '@/lib/admin'
import { shellSessions } from '@/lib/ssh/shells'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  data: z.string().max(64_000).optional(),
  cols: z.number().int().min(2).max(500).optional(),
  rows: z.number().int().min(2).max(500).optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params
  const user = await getCurrentDbUser()
  const session = shellSessions.get(sid)
  if (!user || !session || session.userId !== user.id) {
    return new Response('세션이 없습니다', { status: 404 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return new Response('잘못된 요청', { status: 400 })

  const { data, cols, rows } = parsed.data
  if (data) session.stream.write(data)
  if (cols && rows) session.stream.setWindow(rows, cols, 0, 0)
  return new Response(null, { status: 204 })
}
