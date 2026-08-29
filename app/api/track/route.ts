import { NextRequest } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// First-party analytics beacon. Public and unauthenticated by design — it
// records only what the client chooses to send, bounded below. Always returns
// 204: tracking failures must never surface to the page.

const EVENTS = new Set(['pageview', 'signup'])

function clamp(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const event = typeof body.event === 'string' && EVENTS.has(body.event) ? body.event : 'pageview'
    // Query strings are stripped: a path must never carry a magic-link token.
    const path = clamp(body.path, 200)?.split('?')[0]
    if (!path || !path.startsWith('/')) return new Response(null, { status: 204 })

    const { error } = await supabase.from('page_views').insert({
      event,
      path,
      referrer: clamp(body.referrer, 500),
      utm_source: clamp(body.utm_source, 100),
      utm_medium: clamp(body.utm_medium, 100),
      utm_campaign: clamp(body.utm_campaign, 100),
      visitor_id: clamp(body.visitor_id, 64),
    })
    if (error) console.error('track insert failed:', error.message)
  } catch {
    // Malformed beacon — drop it.
  }
  return new Response(null, { status: 204 })
}
