'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const VISITOR_KEY = 'operator-visitor'

function visitorId(): string | undefined {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return undefined
  }
}

/** Fire-and-forget event to /api/track. Never throws, never blocks the page. */
export function track(event: 'pageview' | 'signup') {
  try {
    const params = new URLSearchParams(window.location.search)
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event,
        // Pathname only — the query string can carry a magic-link token.
        path: window.location.pathname,
        referrer: document.referrer || undefined,
        utm_source: params.get('utm_source') ?? undefined,
        utm_medium: params.get('utm_medium') ?? undefined,
        utm_campaign: params.get('utm_campaign') ?? undefined,
        visitor_id: visitorId(),
      }),
    }).catch(() => {})
  } catch {
    // Tracking must never break the page.
  }
}

/** Records a pageview on load and on every client-side navigation. */
export default function Track() {
  const pathname = usePathname()
  useEffect(() => {
    track('pageview')
  }, [pathname])
  return null
}
