import { SignJWT } from 'jose'
import { NextResponse } from 'next/server'

export async function GET() {
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET!)
  const token = await new SignJWT({
    email: 'preview@buildyouroperator.com',
    tier: 'recruit',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  return NextResponse.json({ token })
}
