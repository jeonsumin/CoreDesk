import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// k8s liveness/readiness 프로브 전용. DB에 의존하지 않는다.
// DB 장애로 전체 파드가 재시작되는 것을 막기 위해 프로세스 생존 여부만 확인한다.
export function GET() {
  return NextResponse.json({ status: 'ok' })
}
