import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: '회원가입은 현재 비활성화되어 있습니다' },
    { status: 403 },
  )
}
