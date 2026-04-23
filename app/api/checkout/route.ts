import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://buildyouroperator.com'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

const PRICE_IDS: Record<string, string | undefined> = {
  recruit: process.env.STRIPE_PRICE_RECRUIT,
  agent: process.env.STRIPE_PRICE_AGENT,
  operator: process.env.STRIPE_PRICE_OPERATOR,
  bundle: process.env.STRIPE_PRICE_BUNDLE,
}

export async function POST(req: NextRequest) {
  try {
    const { token, product = 'recruit' } = await req.json()

    const priceId = PRICE_IDS[product]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/recruit/success?session_id={CHECKOUT_SESSION_ID}&product=${product}`,
      cancel_url: `${BASE_URL}${token ? `/recruit/1?token=${token}` : ''}`,
      metadata: { token: token ?? '', product },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Checkout unavailable. Please try again.' }, { status: 500 })
  }
}
