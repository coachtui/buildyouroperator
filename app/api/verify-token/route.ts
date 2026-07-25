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

    // Free flip: every valid token gets the full course.
    return NextResponse.json({ ok: true, tier: payload.tier ?? 'recruit', maxLesson: 6 })
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      return NextResponse.json({ error: 'expired' }, { status: 401 })
    }
    return NextResponse.json({ error: 'invalid' }, { status: 401 })
  }
}
