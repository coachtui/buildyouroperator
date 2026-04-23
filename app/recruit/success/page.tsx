'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function SuccessInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [token, setToken] = useState('')

  useEffect(() => {
    if (!sessionId) { setState('error'); return }
    fetch('/api/checkout/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) { setToken(data.token); setState('success') }
        else setState('error')
      })
      .catch(() => setState('error'))
  }, [sessionId])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-6" style={{ color: 'var(--muted)' }}>We couldn&apos;t verify your payment. Email gojo@buildyouroperator.com and we&apos;ll sort it out immediately.</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#000' }}>Back to home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-lg text-center">
        <p className="text-xs tracking-widest uppercase mb-6" style={{ color: 'var(--accent)' }}>Operator</p>
        <h1 className="text-4xl font-bold mb-4">You&apos;re a founding member.</h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: 'var(--muted)' }}>
          Recruit tier is yours. Six conversations with Gojo — start whenever you&apos;re ready.
          Your access link is permanent and unique to you.
        </p>
        <button
          onClick={() => router.push(`/recruit/1?token=${token}`)}
          className="px-8 py-4 rounded-lg text-base font-semibold mb-6"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          Start Lesson 1 →
        </button>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Bookmark this page or save your lesson link — a copy is on its way to your inbox.
        </p>
      </div>
    </div>
  )
}

export default function Success() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  )
}
