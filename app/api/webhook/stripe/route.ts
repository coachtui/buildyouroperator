import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SignJWT } from 'jose'
import { Resend } from 'resend'
import { supabase } from '@/app/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Gojo at Operator <gojo@mail.buildyouroperator.com>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://buildyouroperator.com'

type Tier = 'recruit' | 'agent' | 'operator' | 'bundle'

function productToTier(product: string | undefined | null): Tier {
  if (product === 'agent' || product === 'operator' || product === 'bundle') return product
  return 'recruit'
}

async function generateFullAccessToken(email: string, tier: Tier): Promise<string> {
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
  return new SignJWT({ email, tier, access: 'full' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid.' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true })
  }

  const email = session.customer_details?.email
  if (!email) return NextResponse.json({ received: true })

  const tier = productToTier(session.metadata?.product)
  const token = await generateFullAccessToken(email.toLowerCase(), tier)
  const lesson1Url = `${BASE_URL}/recruit/1?token=${token}`

  await Promise.all([
    supabase
      .from('users')
      .upsert(
        { email: email.toLowerCase(), tier, token, current_lesson: 1 },
        { onConflict: 'email', ignoreDuplicates: false }
      ),

    resend.emails.send({
      from: FROM,
      to: email.toLowerCase(),
      subject: "You're in. Here's your Operator access link.",
      html: `
        <div style="background:#080808;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;">
          <p style="color:#c9973a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:32px;">Operator</p>
          <h1 style="font-size:28px;font-weight:700;line-height:1.3;margin-bottom:16px;">You're a founding member.</h1>
          <p style="color:#888;line-height:1.7;margin-bottom:24px;">
            Payment confirmed. Your Recruit access is permanent and unique to you.
            Bookmark this email — your link is below.
          </p>
          <a href="${lesson1Url}" style="display:inline-block;background:#c9973a;color:#000;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
            Start Lesson 1 →
          </a>
          <div style="border-top:1px solid #1a1a1a;padding-top:24px;margin-top:24px;">
            <p style="color:#555;font-size:12px;">Gojo · Operator by AIGA LLC</p>
            <p style="color:#444;font-size:11px;margin-top:8px;">This link is unique to you. Don't share it.</p>
          </div>
        </div>
      `,
    }),
  ])

  return NextResponse.json({ received: true })
}
