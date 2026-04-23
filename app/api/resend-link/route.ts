import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { SignJWT } from 'jose'
import { supabase } from '@/app/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Gojo at Operator <gojo@mail.buildyouroperator.com>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://buildyouroperator.com'

async function generateAccessToken(email: string, tier: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
  return new SignJWT({ email, tier, lesson: 1 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  const normalized = email.toLowerCase().trim()

  const { data: user } = await supabase
    .from('users')
    .select('id, tier')
    .eq('email', normalized)
    .single()

  // Always return success — don't reveal whether email exists
  if (!user) {
    return NextResponse.json({ message: "If you're on the list, your link is on the way." })
  }

  const token = await generateAccessToken(normalized, user.tier)

  await supabase
    .from('users')
    .update({ token })
    .eq('id', user.id)

  const lesson1Url = `${BASE_URL}/recruit/1?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: normalized,
    subject: 'Your Operator access link',
    html: `
      <div style="background:#080808;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;">
        <p style="color:#c9973a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:32px;">Operator</p>
        <h1 style="font-size:28px;font-weight:700;line-height:1.3;margin-bottom:16px;">Here's your link.</h1>
        <p style="color:#888;line-height:1.7;margin-bottom:32px;">
          You requested your Operator access link. Use it to pick up where you left off — your progress is saved.
        </p>
        <a href="${lesson1Url}" style="display:inline-block;background:#c9973a;color:#000;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
          Continue Lesson 1 →
        </a>
        <div style="border-top:1px solid #1a1a1a;padding-top:24px;margin-top:24px;">
          <p style="color:#555;font-size:12px;">Gojo · Operator by AIGA LLC</p>
          <p style="color:#444;font-size:11px;margin-top:8px;">This link is unique to you. Don't share it.</p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ message: "If you're on the list, your link is on the way." })
}
