import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://buildyouroperator.com'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${BASE_URL}/recruit/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}${token ? `/recruit/1?token=${token}` : ''}`,
    metadata: { token: token ?? '' },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
