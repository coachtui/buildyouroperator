'use client'

import { useState } from 'react'
import ThemeToggle from './components/ThemeToggle'
import DemoChat from './components/DemoChat'

const LESSONS = [
  { number: '01', title: 'What AI Actually Is', desc: 'Not magic, not a search engine. One conversation that replaces your mental model with a working one.' },
  { number: '02', title: 'Your First Real Instruction', desc: 'The difference between a weak ask and a strong one — you rewrite one of your own, live.' },
  { number: '03', title: 'Picking Your Tool', desc: 'ChatGPT, Claude, or Gemini — one recommendation for your situation, so you stop tab-hopping.' },
  { number: '04', title: 'AI for Your Job', desc: 'You leave with 2–3 real prompts for your actual work. Not templates — yours.' },
  { number: '05', title: 'Your First Workflow', desc: 'One repeating task, mapped into steps, turned into something you run in minutes. You run it before the lesson ends.' },
  { number: '06', title: 'Operator Mindset', desc: 'Users ask AI questions. Operators give AI jobs. By this point you have already crossed the line — this names it.' },
]

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent'>('idle')

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

  const signupForm = (variant: 'solid' | 'outline') =>
    status === 'success' ? (
      <div className="rounded-xl p-6 border max-w-lg" style={{ background: 'rgba(201,151,58,0.1)', borderColor: 'var(--accent)' }}>
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
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-80 cursor-pointer border"
          style={variant === 'solid'
            ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' }
            : { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          {status === 'loading' ? 'Sending...' : 'Start free'}
        </button>
      </form>
    )

  return (
    <main className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>
          Operator
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>by AIGA LLC</span>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div
            className="inline-block mb-6 px-3 py-1 text-xs tracking-widest uppercase rounded-full border"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(201,151,58,0.08)' }}
          >
            Free · Six conversations · No videos
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-4">
            You don&apos;t watch AI.<br />
            <span style={{ color: 'var(--accent)' }}>You talk to it.</span>
          </h1>

          <p className="text-lg sm:text-xl font-semibold mb-4 leading-snug">
            You build with it. You run it.
          </p>

          <p className="text-base sm:text-lg mb-4 leading-relaxed">
            Most people use AI for answers.<br />
            Operators use AI to eliminate work.
          </p>

          <p className="text-base sm:text-lg mb-10 leading-relaxed" style={{ color: 'var(--muted)' }}>
            This is how you become one.
          </p>

          {signupForm('solid')}

          {status === 'error' && (
            <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>{message}</p>
          )}

          <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
            All six lessons, free. Your private link arrives by email. No card, no catch.
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
              Most people use AI.<br />
              <span style={{ color: 'var(--accent)' }}>You&apos;re here to run it.</span>
            </h2>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>
              No videos. No slides. Just real interaction.
            </p>
            <p className="leading-relaxed" style={{ color: 'var(--muted)' }}>
              You don&apos;t learn AI by watching it. You learn by using it — correctly.<br /><br />
              Operator pushes back, asks questions, and forces clarity until you actually understand what you&apos;re doing.<br /><br />
              And it remembers you. The teacher in Lesson 6 knows what you struggled with in Lesson 1 — because it was there.
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

      {/* Inline demo */}
      <DemoChat />

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* The path */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-3">Six conversations. Zero videos.</h2>
        <p className="mb-2" style={{ color: 'var(--muted)' }}>
          Each lesson is a real back-and-forth, 15–30 minutes, built around your actual work.
        </p>
        <p className="mb-10 text-sm" style={{ color: 'var(--muted)' }}>
          Go at your own pace. Your teacher remembers where you left off — and what you struggled with.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {LESSONS.map(l => (
            <div key={l.number} className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <span className="text-xs tracking-widest" style={{ color: 'var(--accent)' }}>{l.number}</span>
              <h3 className="text-lg font-bold mt-2 mb-2">{l.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{l.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-6 border mb-12 max-w-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>How this works</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            This isn&apos;t a static program — it&apos;s a living system.<br />
            Every conversation is refined based on real usage.<br />
            The version you run today is better than last month&apos;s.<br />
            Next month&apos;s will be better than today&apos;s.
          </p>
        </div>

        <div id="get-lesson-free" className="flex items-center gap-3 max-w-lg mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>ready when you are</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {signupForm('outline')}
      </section>

      {/* Lost your link */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center gap-3 max-w-lg mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>already signed up?</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>
        {resendStatus === 'sent' ? (
          <p className="text-sm max-w-lg" style={{ color: 'var(--muted)' }}>
            If you&apos;re on the list, your link is on the way.
          </p>
        ) : (
          <form
            onSubmit={async e => {
              e.preventDefault()
              if (!resendEmail) return
              setResendStatus('loading')
              await fetch('/api/resend-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resendEmail }),
              })
              setResendStatus('sent')
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-lg"
          >
            <input
              type="email"
              required
              value={resendEmail}
              onChange={e => setResendEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 rounded-lg text-sm outline-none border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
            <button
              type="submit"
              disabled={resendStatus === 'loading'}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-80 cursor-pointer border"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }}
            >
              {resendStatus === 'loading' ? 'Sending...' : 'Resend my link'}
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
        <div className="flex items-center gap-5 text-xs" style={{ color: 'var(--muted)' }}>
          <a href="/privacy" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms</a>
          <a href="/faq" style={{ color: 'var(--muted)', textDecoration: 'none' }}>FAQ</a>
          <span>© 2026 AIGA LLC</span>
        </div>
      </footer>

    </main>
  )
}
