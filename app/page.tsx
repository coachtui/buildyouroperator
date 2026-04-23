'use client'

import { useState } from 'react'

async function startCheckout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: null }),
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
        <p className="mb-12" style={{ color: 'var(--muted)' }}>
          You don&apos;t complete Operator. You become one.
        </p>

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
            },
            {
              label: '02',
              name: 'Agent',
              tagline: 'Build It',
              desc: 'Build workflows, prompt systems, and repeatable processes. You stop using AI and start deploying it.',
              price: '$197',
              fullPrice: '$397',
              current: false,
            },
            {
              label: '03',
              name: 'Operator',
              tagline: 'Run It',
              desc: 'Running AI at scale across a team, a business, a life. This is the designation. You earn it.',
              price: '$497',
              fullPrice: '$997',
              current: false,
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

      {/* Founding cohort CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Founding cohort.<br />50 spots. Then the price doubles.
          </h2>
          <p className="mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Founding members get Recruit at $97 — locked in for life.
            They also get direct access during the build: what&apos;s working, what isn&apos;t,
            and a say in what comes next. This isn&apos;t a discount. It&apos;s a different relationship.
          </p>
          <ul className="space-y-3 mb-10">
            {[
              'Lesson 1 free — talk to the AI today, no card required',
              'Founding price locked: $97 (full price $197 at launch)',
              'Direct channel with the build team during Recruit tier',
              'First access to Agent and Operator tiers before public release',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span style={{ color: 'var(--accent)' }}>—</span>
                <span style={{ color: 'var(--muted)' }}>{item}</span>
              </li>
            ))}
          </ul>

          {status === 'success' ? (
            <div className="rounded-xl p-6 border" style={{ background: 'rgba(201,151,58,0.1)', borderColor: 'var(--accent)' }}>
              <p className="font-semibold" style={{ color: 'var(--accent)' }}>You&apos;re on the list. Check your inbox for Lesson 1.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={startCheckout}
                className="w-full sm:w-auto px-8 py-4 rounded-lg text-base font-semibold"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                Join founding cohort — $97
              </button>
              <div className="flex items-center gap-3 max-w-lg">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>or try Lesson 1 free first</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
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
                  className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 border"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
                >
                  {status === 'loading' ? 'Joining...' : 'Get Lesson 1 free'}
                </button>
              </form>
            </div>
          )}
        </div>
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
