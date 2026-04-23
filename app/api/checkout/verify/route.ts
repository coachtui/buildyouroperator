import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SignJWT } from 'jose'
import { supabase } from '@/app/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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
    .sign(secret) // no expiry — paid access is permanent
}

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'No session.' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed.' }, { status: 402 })
    }

    const email = session.customer_details?.email
    if (!email) {
      return NextResponse.json({ error: 'No email on session.' }, { status: 400 })
    }

    const tier = productToTier(session.metadata?.product)
    const token = await generateFullAccessToken(email, tier)

    await supabase
      .from('users')
      .upsert(
        { email: email.toLowerCase(), tier, token, current_lesson: 1 },
        { onConflict: 'email', ignoreDuplicates: false }
      )

    return NextResponse.json({ token, email })
  } catch (err) {
    console.error('Stripe verify error:', err)
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 })
  }
}
