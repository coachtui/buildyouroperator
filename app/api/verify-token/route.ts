import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, errors } from 'jose'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'No token.' }, { status: 401 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
    const { payload } = await jwtVerify(token, secret)

    // Waitlist tokens have lesson:1 and no access:'full' — restrict to lesson 1 only
    const maxLesson = payload.access === 'full' ? 6 : 1

    return NextResponse.json({ ok: true, tier: payload.tier ?? 'recruit', maxLesson })
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      return NextResponse.json({ error: 'expired' }, { status: 401 })
    }
    return NextResponse.json({ error: 'invalid' }, { status: 401 })
  }
}
