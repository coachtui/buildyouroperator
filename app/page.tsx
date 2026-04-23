'use client'

import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [gate, setGate] = useState<'agent' | 'operator' | null>(null)

  async function startCheckout(product: string) {
    setCheckoutError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: null, product }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError('Something went wrong. Try again or contact us.')
      }
    } catch {
      setCheckoutError('Something went wrong. Try again or contact us.')
    }
  }

  function handleCardClick(product: string) {
    if (product === 'agent') { setGate('agent'); return }
    if (product === 'operator') { setGate('operator'); return }
    startCheckout(product)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(data.message)
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>
          Operator
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          by AIGA LLC
        </span>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div
            className="inline-block mb-6 px-3 py-1 text-xs tracking-widest uppercase rounded-full border"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(201,151,58,0.08)' }}
          >
            Founding Cohort · 50 spots · Recruit from $97
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
            You don&apos;t watch AI.<br />
            <span style={{ color: 'var(--accent)' }}>You talk to it.</span>
          </h1>

          <p className="text-lg sm:text-xl mb-10 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Operator is the only AI course taught entirely through conversation.
            No videos. No slides. Just you and an AI that asks questions back, corrects your thinking, and won&apos;t move on until you get it.
          </p>

          {status === 'success' ? (
            <div className="rounded-xl p-6 border" style={{ background: 'rgba(201,151,58,0.1)', borderColor: 'var(--accent)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>You&apos;re in.</p>
              <p style={{ color: 'var(--muted)' }}>{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-lg text-sm outline-none border"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-80 cursor-pointer"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>{message}</p>
          )}

          <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
            Waitlist gets Lesson 1 free — instantly. Founding price locks at $97.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* Differentiator */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              Every other AI course is a video.<br />
              <span style={{ color: 'var(--accent)' }}>This one is a conversation.</span>
            </h2>
            <p className="leading-relaxed" style={{ color: 'var(--muted)' }}>
              You don&apos;t learn to talk to AI by watching someone else do it.
              In Operator, you learn by doing — with an AI that asks questions back,
              corrects your thinking in real time, and doesn&apos;t move on until you get it.
            </p>
          </div>
          <div className="rounded-xl p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent)', color: '#000' }}>G</div>
                <p className="rounded-2xl px-4 py-2.5 leading-relaxed" style={{ background: 'rgba(201,151,58,0.12)', border: '1px solid rgba(201,151,58,0.2)', color: 'var(--foreground)' }}>
                  Before we start — what do you think AI actually is, in your own words?
                </p>
              </div>
              <div className="flex gap-3 items-start justify-end">
                <p className="rounded-2xl px-4 py-2.5 leading-relaxed" style={{ background: 'var(--border)', color: 'var(--foreground)' }}>
                  Honestly? I think it&apos;s kind of like a really smart Google.
                </p>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>Y</div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent)', color: '#000' }}>G</div>
                <p className="rounded-2xl px-4 py-2.5 leading-relaxed" style={{ background: 'rgba(201,151,58,0.12)', border: '1px solid rgba(201,151,58,0.2)', color: 'var(--foreground)' }}>
                  Most people say that. Here&apos;s the problem with it — what does Google do when you type something in?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-3">Three levels. One destination.</h2>
        <p className="mb-4" style={{ color: 'var(--muted)' }}>
          You don&apos;t complete Operator. You become one.
        </p>
        <div className="inline-flex items-start gap-2 mb-12 px-4 py-3 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>
          <span style={{ color: 'var(--accent)' }}>—</span>
          <span>Each level requires completing the one before it. You can&apos;t skip ahead.</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            {
              product: 'recruit',
              label: '01',
              name: 'Recruit',
              tagline: 'Use It',
              desc: 'Zero to daily AI user. Six conversations that turn a skeptic into someone who opens the tool before anything else.',
              features: ['6 conversation lessons', 'Lesson 1 free today', 'Founding member access', 'Direct channel with build team'],
              price: '$97',
              full: '$197',
              badge: 'Open now',
              badgeStyle: { background: 'var(--accent)', color: '#000' } as React.CSSProperties,
              highlight: false,
            },
            {
              product: 'agent',
              label: '02',
              name: 'Agent',
              tagline: 'Build It',
              desc: 'You\'re using AI daily. Now you build with it. Workflows, prompt systems, and repeatable processes you can hand to anyone.',
              features: ['Requires Recruit completion', 'Workflow + prompt systems', 'Readiness assessment', 'Monthly cohort start'],
              price: '$197',
              full: '$397',
              badge: 'Requires Recruit',
              badgeStyle: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' } as React.CSSProperties,
              highlight: false,
            },
            {
              product: 'operator',
              label: '03',
              name: 'Operator',
              tagline: 'Run It',
              desc: 'Running AI at scale — across a team, a business, a life. You earn this designation by doing the work before it.',
              features: ['Requires Agent completion', 'AI at team/business scale', 'Small cohort (20 max)', 'Quarterly start'],
              price: '$497',
              full: '$997',
              badge: 'Requires Agent',
              badgeStyle: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' } as React.CSSProperties,
              highlight: false,
            },
            {
              product: 'bundle',
              label: null,
              name: 'Full Track',
              tagline: 'All Three',
              desc: 'All three tiers in one. Start at Recruit today and unlock each level as you complete the one before it.',
              features: ['All three tiers included', 'Save $194 vs individual', 'Start at Recruit today', 'Unlock as you complete each'],
              price: '$597',
              full: '$1,591',
              badge: 'Best value',
              badgeStyle: { background: 'var(--accent)', color: '#000' } as React.CSSProperties,
              highlight: true,
            },
          ].map((p) => (
            <div
              key={p.product}
              className="rounded-xl p-5 border flex flex-col"
              style={{
                background: p.highlight ? 'rgba(201,151,58,0.06)' : 'var(--surface)',
                borderColor: p.highlight ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs tracking-widest" style={{ color: 'var(--muted)' }}>{p.label ?? ''}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={p.badgeStyle}>{p.badge}</span>
              </div>
              <h3 className="text-xl font-bold mb-0.5">{p.name}</h3>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>{p.tagline}</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>{p.desc}</p>
              <ul className="space-y-1.5 flex-1 mb-5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--accent)' }}>—</span>{f}
                  </li>
                ))}
              </ul>
              <div className="mb-4">
                <span className="text-2xl font-bold">{p.price}</span>
                <span className="text-xs ml-2 line-through" style={{ color: 'var(--muted)' }}>{p.full}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>founding cohort · one time</p>
              </div>
              <button
                onClick={() => handleCardClick(p.product)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border transition-opacity hover:opacity-80 cursor-pointer"
                style={p.highlight
                  ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' }
                  : { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                {p.product === 'agent' || p.product === 'operator' ? 'Apply' : 'Get started'}
              </button>
            </div>
          ))}
        </div>

        {checkoutError && (
          <p className="text-sm mb-6" style={{ color: '#ef4444' }}>{checkoutError}</p>
        )}

        <div className="flex items-center gap-3 max-w-lg mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>not ready to pay? try Lesson 1 free first</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {status === 'success' ? (
          <div className="rounded-xl p-5 border max-w-lg" style={{ background: 'rgba(201,151,58,0.1)', borderColor: 'var(--accent)' }}>
            <p className="font-semibold" style={{ color: 'var(--accent)' }}>You&apos;re on the list. Check your inbox for Lesson 1.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-80 cursor-pointer border"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
            >
              {status === 'loading' ? 'Joining...' : 'Get Lesson 1 free'}
            </button>
          </form>
        )}
      </section>

      {/* Gate modal */}
      {gate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-2xl p-8 border max-w-md w-full" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>
              {gate === 'agent' ? '02 · Agent' : '03 · Operator'}
            </p>
            <h2 className="text-2xl font-bold mb-3">
              {gate === 'agent' ? 'Before you join Agent' : 'Before you join Operator'}
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
              {gate === 'agent'
                ? 'Agent is for people who are already using AI daily. It requires completing Recruit first. If you haven\'t done Recruit, start there — Agent will make more sense after.'
                : 'Operator is for people who have completed both Recruit and Agent. If you\'re not there yet, the Full Track gets you in at a better price and unlocks each tier as you complete it.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setGate(null); startCheckout(gate) }}
                className="w-full py-3 rounded-lg text-sm font-semibold hover:opacity-80 cursor-pointer transition-opacity"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                I&apos;ve completed the prerequisite — continue
              </button>
              <button
                onClick={() => { setGate(null); startCheckout('bundle') }}
                className="w-full py-3 rounded-lg text-sm font-semibold border hover:opacity-80 cursor-pointer transition-opacity"
                style={{ background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                Get the Full Track instead ($597)
              </button>
              <button
                onClick={() => setGate(null)}
                className="w-full py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: 'var(--muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>
          Operator
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          © 2026 AIGA LLC
        </span>
      </footer>

    </main>
  )
}
