'use client'

import { useState } from 'react'

async function startCheckout(product: string = 'recruit') {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: null, product }),
  })
  const { url } = await res.json()
  if (url) window.location.href = url
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

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
            Founding Cohort — 50 spots at $97
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
            You don&apos;t watch AI.<br />
            <span style={{ color: 'var(--accent)' }}>You talk to it.</span>
          </h1>

          <p className="text-lg sm:text-xl mb-10 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Operator is the only AI course taught entirely through conversation.
            No videos. No slides. Just you and an AI that teaches by doing — lesson by lesson, question by question.
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
                className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
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
              <div className="flex gap-3 items-end">
                <span className="text-xs shrink-0 pb-2" style={{ color: 'var(--muted)' }}>You</span>
                <p className="rounded-lg px-4 py-2" style={{ background: 'var(--border)' }}>
                  What&apos;s the difference between a good prompt and a bad one?
                </p>
              </div>
              <div className="flex gap-3 items-end justify-end">
                <p className="rounded-lg px-4 py-2" style={{ background: 'rgba(201,151,58,0.15)', color: 'var(--foreground)' }}>
                  Good question. Before I answer — what did your last prompt actually get you?
                </p>
                <span className="text-xs shrink-0 pb-2" style={{ color: 'var(--accent)' }}>AI</span>
              </div>
              <div className="flex gap-3 items-end">
                <span className="text-xs shrink-0 pb-2" style={{ color: 'var(--muted)' }}>You</span>
                <p className="rounded-lg px-4 py-2" style={{ background: 'var(--border)' }}>
                  Something generic. Not what I needed.
                </p>
              </div>
              <div className="flex gap-3 items-end justify-end">
                <p className="rounded-lg px-4 py-2" style={{ background: 'rgba(201,151,58,0.15)', color: 'var(--foreground)' }}>
                  Exactly. Let&apos;s fix it right now. Tell me what you were actually trying to do.
                </p>
                <span className="text-xs shrink-0 pb-2" style={{ color: 'var(--accent)' }}>AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* Tiers */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-3">Three levels. One destination.</h2>
        <p className="mb-6" style={{ color: 'var(--muted)' }}>
          You don&apos;t complete Operator. You become one.
        </p>
        <div className="inline-flex items-start gap-2 mb-12 px-4 py-3 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>
          <span style={{ color: 'var(--accent)' }}>—</span>
          <span>Each level requires completing the one before it. Agent requires Recruit. Operator requires Agent. You can&apos;t skip ahead.</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              label: '01',
              name: 'Recruit',
              tagline: 'Use It',
              desc: 'Zero to daily AI user. Six conversations that turn a skeptic into someone who opens the tool before anything else.',
              price: '$97',
              fullPrice: '$197',
              current: true,
              prereq: null,
            },
            {
              label: '02',
              name: 'Agent',
              tagline: 'Build It',
              desc: 'You\'re using AI daily. Now you build with it. Workflows, prompt systems, and repeatable processes you can hand to anyone. You stop being a user and start being a builder.',
              price: '$197',
              fullPrice: '$397',
              current: false,
              prereq: 'Requires Recruit',
            },
            {
              label: '03',
              name: 'Operator',
              tagline: 'Run It',
              desc: 'Running AI at scale — across a team, a business, a life. This is the designation the whole course is named after. You earn it by doing the work before it.',
              price: '$497',
              fullPrice: '$997',
              current: false,
              prereq: 'Requires Agent',
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl p-6 border flex flex-col"
              style={{
                background: tier.current ? 'rgba(201,151,58,0.06)' : 'var(--surface)',
                borderColor: tier.current ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs tracking-widest" style={{ color: 'var(--muted)' }}>{tier.label}</span>
                {tier.current && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#000' }}>
                    Open now
                  </span>
                )}
                {tier.prereq && (
                  <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    {tier.prereq}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold mb-1">{tier.name}</h3>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>{tier.tagline}</p>
              <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: 'var(--muted)' }}>{tier.desc}</p>
              <div>
                <span className="text-2xl font-bold">{tier.price}</span>
                <span className="text-sm ml-2 line-through" style={{ color: 'var(--muted)' }}>{tier.fullPrice}</span>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>founding cohort price</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-3">Founding cohort pricing.</h2>
        <p className="mb-12" style={{ color: 'var(--muted)' }}>
          50 spots. Then prices double. This isn&apos;t a sale — it&apos;s a different relationship.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { product: 'recruit', name: 'Recruit', tagline: 'Use It', price: '$97', full: '$197', features: ['6 conversation lessons', 'Lesson 1 free today', 'Founding member access', 'Direct channel with build team'], highlight: false },
            { product: 'agent', name: 'Agent', tagline: 'Build It', price: '$197', full: '$397', features: ['Requires Recruit completion', 'Workflow + prompt systems', 'Readiness assessment', 'Monthly cohort start'], highlight: false },
            { product: 'operator', name: 'Operator', tagline: 'Run It', price: '$497', full: '$997', features: ['Requires Agent completion', 'AI at team/business scale', 'Small cohort (20 max)', 'Quarterly start'], highlight: false },
            { product: 'bundle', name: 'Full Track', tagline: 'All Three', price: '$597', full: '$1,591', features: ['All three tiers included', 'Save $194 vs individual', 'Start at Recruit today', 'Unlock as you complete each'], highlight: true },
          ].map((p) => (
            <div key={p.product} className="rounded-xl p-5 border flex flex-col" style={{ background: p.highlight ? 'rgba(201,151,58,0.06)' : 'var(--surface)', borderColor: p.highlight ? 'var(--accent)' : 'var(--border)' }}>
              {p.highlight && (
                <span className="text-xs px-2 py-0.5 rounded-full self-start mb-3" style={{ background: 'var(--accent)', color: '#000' }}>Best value</span>
              )}
              <h3 className="text-lg font-bold mb-0.5">{p.name}</h3>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>{p.tagline}</p>
              <ul className="space-y-2 flex-1 mb-5">
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
                onClick={() => startCheckout(p.product)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border transition-opacity"
                style={p.highlight
                  ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' }
                  : { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                Get started
              </button>
            </div>
          ))}
        </div>

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
              className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 border"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
            >
              {status === 'loading' ? 'Joining...' : 'Get Lesson 1 free'}
            </button>
          </form>
        )}
      </section>

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
