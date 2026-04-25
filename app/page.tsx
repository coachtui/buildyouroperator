'use client'

import { useState, useEffect } from 'react'
import ThemeToggle from './components/ThemeToggle'

type AnswerValue = 'pass' | 'neutral' | 'fail'
type Question = {
  id: string
  text: string
  options: { label: string; value: AnswerValue }[]
}

const AGENT_QUESTIONS: Question[] = [
  {
    id: 'frequency',
    text: 'How often do you currently use AI tools like ChatGPT, Claude, or Gemini?',
    options: [
      { label: "I'm just getting started — haven't used them much", value: 'fail' },
      { label: 'A few times a week, still exploring', value: 'neutral' },
      { label: 'Every day — already part of how I work', value: 'pass' },
    ],
  },
  {
    id: 'real_work',
    text: 'Have you used AI to complete actual work tasks — not just experiment with it?',
    options: [
      { label: 'No, mostly just asking questions and exploring', value: 'fail' },
      { label: 'A few times — I can see the potential', value: 'neutral' },
      { label: "Yes — it's already saved me real time on real work", value: 'pass' },
    ],
  },
  {
    id: 'goal',
    text: 'What do you want from the Agent tier?',
    options: [
      { label: "I'm still figuring out what AI can actually do", value: 'fail' },
      { label: 'Build reusable prompt systems and workflows', value: 'pass' },
      { label: 'Connect AI to my tools and automate my work', value: 'pass' },
    ],
  },
]

const OPERATOR_QUESTIONS: Question[] = [
  {
    id: 'systematic',
    text: 'Are you using AI in a systematic, repeatable way — not just when you think of it?',
    options: [
      { label: 'Not yet — still case-by-case when I need it', value: 'fail' },
      { label: "Sometimes — working toward consistency", value: 'neutral' },
      { label: 'Yes — I have workflows and systems I run regularly', value: 'pass' },
    ],
  },
  {
    id: 'built_for_others',
    text: 'Have you built something with AI that other people use or depend on?',
    options: [
      { label: "No, still personal use only", value: 'fail' },
      { label: "Working on it — I have a clear project in mind", value: 'neutral' },
      { label: 'Yes — a team or client depends on something I built', value: 'pass' },
    ],
  },
  {
    id: 'goal',
    text: "What's your goal at the Operator level?",
    options: [
      { label: 'Learn more about what AI can do', value: 'fail' },
      { label: 'Run AI systems across a team or business', value: 'pass' },
      { label: 'Build and operate autonomous AI at scale', value: 'pass' },
    ],
  },
]

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [gate, setGate] = useState<'agent' | 'operator' | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizResult, setQuizResult] = useState<'not-ready' | null>(null)

  useEffect(() => {
    fetch('/api/count').then(r => r.json()).then(d => setSpotsLeft(d.remaining))
  }, [])

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
        setCheckoutError(data.error || 'Something went wrong. Try again or contact us.')
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

  function closeGate() {
    setGate(null)
    setQuizAnswers({})
    setQuizResult(null)
  }

  function submitQuiz() {
    if (!gate) return
    const questions = gate === 'agent' ? AGENT_QUESTIONS : OPERATOR_QUESTIONS
    if (!questions.every(q => quizAnswers[q.id] !== undefined)) return
    const score = questions.reduce((sum, q) => {
      const opt = q.options[quizAnswers[q.id]]
      if (opt.value === 'pass') return sum + 1
      if (opt.value === 'neutral') return sum + 0.5
      return sum
    }, 0)
    if (score >= 2) {
      const product = gate
      closeGate()
      startCheckout(product)
    } else {
      setQuizResult('not-ready')
    }
  }

  const gateQuestions = gate ? (gate === 'agent' ? AGENT_QUESTIONS : OPERATOR_QUESTIONS) : []
  const allAnswered = gateQuestions.every(q => quizAnswers[q.id] !== undefined)

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
            Founding Cohort · {spotsLeft === null ? '50' : spotsLeft} spots left · Recruit from $97
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-4">
            You don&apos;t watch AI.<br />
            <span style={{ color: 'var(--accent)' }}>You talk to it.</span>
          </h1>

          <p className="text-lg sm:text-xl font-semibold mb-6 leading-snug">
            You stop asking AI questions. You give it jobs.
          </p>

          <p className="text-lg sm:text-xl mb-10 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Operator trains you to stop asking AI questions — and start building systems that do work for you.
            No videos. No slides. Just you and an AI that pushes back until you actually get it.
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
              Because knowing how AI works doesn&apos;t help you. Building something that works for you does.
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
        <p className="mb-2" style={{ color: 'var(--muted)' }}>
          You don&apos;t complete Operator. You build things with it.
        </p>
        <p className="mb-8 text-sm" style={{ color: 'var(--muted)' }}>
          Recruit is everything you need to start. Agent and Operator build on top — you won&apos;t need to wait.
        </p>

        <div className="rounded-xl p-6 border mb-12 max-w-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>How this works</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            Recruit is live. Agent and Operator are next.<br /><br />
            This isn&apos;t a static course — it&apos;s a living system.<br />
            Every lesson is continuously refined based on real usage.<br />
            The version you take today is better than last month&apos;s.<br />
            Next month&apos;s will be better than today&apos;s.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            {
              product: 'recruit',
              label: '01',
              name: 'Recruit',
              tagline: 'Use It',
              desc: 'Six conversations. You leave with real prompts that replace actual tasks in your job.',
              features: ['Rewrite real instructions you already use', 'Build prompts that replace actual tasks', 'Turn one repeated task into a reusable system', 'Founding member access'],
              price: '$97',
              full: '$197',
              badge: 'Founding · then $197',
              badgeStyle: { background: 'var(--accent)', color: '#000' } as React.CSSProperties,
              highlight: false,
              comingSoon: false,
            },
            {
              product: 'agent',
              label: '02',
              name: 'Agent',
              tagline: 'Build It',
              desc: 'Workflows, prompt systems, and repeatable processes you can hand to anyone.',
              features: ['Requires Recruit completion', 'Launches after first cohort', 'Founding price locked now'],
              price: '$197',
              full: '$397',
              badge: 'Coming soon',
              badgeStyle: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' } as React.CSSProperties,
              highlight: false,
              comingSoon: true,
            },
            {
              product: 'operator',
              label: '03',
              name: 'Operator',
              tagline: 'Run It',
              desc: 'Running AI at scale — across a team, a business, a life.',
              features: ['Requires Agent completion', 'Small cohort (20 max)', 'Founding price locked now'],
              price: '$497',
              full: '$997',
              badge: 'Coming soon',
              badgeStyle: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' } as React.CSSProperties,
              highlight: false,
              comingSoon: true,
            },
            {
              product: 'bundle',
              label: null,
              name: 'Full Track',
              tagline: 'All Three',
              desc: 'Lock in all three tiers at the founding price. Start Recruit today — Agent and Operator unlock as each tier is built. Launch dates communicated to Bundle members first.',
              features: ['All three tiers included', 'Save $194 vs individual', 'Start Recruit immediately', 'Launch timeline shared with Bundle members first'],
              price: '$597',
              full: '$1,591',
              badge: 'Best value',
              badgeStyle: { background: 'var(--accent)', color: '#000' } as React.CSSProperties,
              highlight: true,
              comingSoon: false,
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
                onClick={() => !p.comingSoon && handleCardClick(p.product)}
                disabled={p.comingSoon}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border transition-opacity"
                style={p.comingSoon
                  ? { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--border)', cursor: 'default', opacity: 0.5 }
                  : p.highlight
                    ? { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)', cursor: 'pointer' }
                    : { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)', cursor: 'pointer' }}
              >
                {p.comingSoon ? 'Coming soon' : 'Get started'}
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

      {/* Readiness quiz modal */}
      {gate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div
            className="rounded-2xl p-8 border max-w-lg w-full"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {quizResult === 'not-ready' ? (
              <div>
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#ef4444' }}>
                  Not quite yet
                </p>
                <h2 className="text-2xl font-bold mb-3">
                  {gate === 'agent' ? 'Start with Recruit first.' : 'Build before you operate.'}
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
                  {gate === 'agent'
                    ? "Agent is for people already in the daily AI habit. Recruit gets you there in 6 conversations — then Agent will click immediately."
                    : "Operator is for people running AI at scale. The Full Track walks you from zero to Operator, unlocking each level as you complete the one before it."}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => { closeGate(); startCheckout(gate === 'agent' ? 'recruit' : 'bundle') }}
                    className="w-full py-3 rounded-lg text-sm font-semibold hover:opacity-80 cursor-pointer transition-opacity"
                    style={{ background: 'var(--accent)', color: '#000' }}
                  >
                    {gate === 'agent' ? 'Get Recruit — $97' : 'Get the Full Track — $597'}
                  </button>
                  <button
                    onClick={closeGate}
                    className="w-full py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>
                  {gate === 'agent' ? '02 · Agent' : '03 · Operator'} · Readiness check
                </p>
                <h2 className="text-xl font-bold mb-1">
                  {gate === 'agent' ? 'Are you ready for Agent?' : 'Are you ready for Operator?'}
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                  Answer honestly — this tier works best when you&apos;re in the right spot.
                </p>

                <div className="space-y-6 mb-8">
                  {gateQuestions.map((q, qi) => (
                    <div key={q.id}>
                      <p className="text-sm font-medium mb-3">
                        <span style={{ color: 'var(--accent)' }}>{qi + 1}.&nbsp;</span>
                        {q.text}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const selected = quizAnswers[q.id] === oi
                          return (
                            <button
                              key={oi}
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oi }))}
                              className="w-full text-left px-4 py-3 rounded-lg text-sm border transition-all cursor-pointer"
                              style={{
                                background: selected ? 'rgba(201,151,58,0.1)' : 'transparent',
                                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                                color: selected ? 'var(--foreground)' : 'var(--muted)',
                              }}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={submitQuiz}
                    disabled={!allAnswered}
                    className="w-full py-3 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-40 cursor-pointer transition-opacity"
                    style={{ background: 'var(--accent)', color: '#000' }}
                  >
                    Continue
                  </button>
                  <button
                    onClick={closeGate}
                    className="w-full py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
