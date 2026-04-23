import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'No token.' }, { status: 401 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return NextResponse.json({ ok: true, tier: payload.tier ?? 'recruit' })
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 })
  }
}
