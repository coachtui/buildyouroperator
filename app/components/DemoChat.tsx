'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_MESSAGES = ['Begin the lesson.']

export default function DemoChat() {
  const [token, setToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [hitLimit, setHitLimit] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/demo-token').then(r => r.json()).then(d => setToken(d.token))
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px'
  }, [input])

  async function streamResponse(payload: Message[]) {
    if (!token) return
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload, lesson: '1', token }),
    })

    if (res.status === 429) {
      setHitLimit(true)
      return
    }

    if (!res.ok || !res.body) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Give it a moment and try again.' }])
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: text }
        return updated
      })
    }
  }

  async function startLesson() {
    if (!token) return
    setStarted(true)
    setLoading(true)
    await streamResponse([{ role: 'user', content: 'Begin the lesson.' }])
    setLoading(false)
  }

  async function handleSend() {
    if (!input.trim() || loading || !token) return
    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    await streamResponse(newMessages)
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function scrollToWaitlist() {
    document.getElementById('get-lesson-free')?.scrollIntoView({ behavior: 'smooth' })
  }

  const visibleMessages = messages.filter(
    m => !(m.role === 'user' && SYSTEM_MESSAGES.some(s => m.content === s))
  )

  const realUserMessageCount = messages.filter(
    m => m.role === 'user' && !SYSTEM_MESSAGES.some(s => m.content === s)
  ).length

  const showCTA = started && !hitLimit && realUserMessageCount >= 3

  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <div className="max-w-2xl mb-8">
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>
          Lesson 1 · Live demo
        </p>
        <h2 className="text-3xl font-bold mb-3">Try it right now.</h2>
        <p className="leading-relaxed" style={{ color: 'var(--muted)' }}>
          This is real. Gojo will ask you a question, push back on your answers, and won&apos;t move on until you actually get it.
        </p>
      </div>

      <div
        className="rounded-xl border overflow-hidden max-w-2xl"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              G
            </div>
            <span className="text-sm font-semibold">Gojo</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>· Recruit · Lesson 1</span>
          </div>
          {started && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(201,151,58,0.1)',
                color: 'var(--accent)',
                border: '1px solid rgba(201,151,58,0.2)',
              }}
            >
              Live
            </span>
          )}
        </div>

        {/* CTA banner */}
        {showCTA && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{
              background: 'rgba(201,151,58,0.06)',
              borderBottom: '1px solid rgba(201,151,58,0.15)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              This is Lesson 1 of 6. Scroll down to unlock the rest — free.
            </p>
            <button
              onClick={scrollToWaitlist}
              className="text-xs font-semibold shrink-0 ml-4 hover:opacity-80 transition-opacity cursor-pointer"
              style={{ color: 'var(--accent)' }}
            >
              Keep going →
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto px-5 py-6 space-y-5"
          style={{ height: '420px', background: 'var(--surface)' }}
        >
          {!started ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
              <div>
                <h3 className="text-lg font-bold mb-2">What AI Actually Is</h3>
                <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--muted)' }}>
                  This isn&apos;t a video. It&apos;s a conversation. By the end, you&apos;ll have one concrete shift in how you understand what AI actually is — and why the quality of your instructions determines everything you get back.
                </p>
              </div>
              <button
                onClick={startLesson}
                disabled={!token}
                className="px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-40 cursor-pointer transition-opacity"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                {token ? 'Start Lesson 1' : 'Loading...'}
              </button>
            </div>
          ) : (
            <>
              {visibleMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: 'var(--accent)', color: '#000' }}
                    >
                      G
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%]"
                    style={{
                      background: msg.role === 'user' ? 'var(--border)' : 'rgba(201,151,58,0.1)',
                      border: `1px solid ${msg.role === 'user' ? 'transparent' : 'rgba(201,151,58,0.2)'}`,
                      color: 'var(--foreground)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                    >
                      Y
                    </div>
                  )}
                </div>
              ))}
              {loading && visibleMessages[visibleMessages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--accent)', color: '#000' }}
                  >
                    G
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(201,151,58,0.1)', border: '1px solid rgba(201,151,58,0.2)' }}
                  >
                    <span className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        {started && !hitLimit && (
          <div
            className="border-t px-4 py-3"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply to Gojo..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none border disabled:opacity-50"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  maxHeight: '100px',
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 hover:opacity-80 cursor-pointer transition-opacity shrink-0"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Limit reached */}
        {hitLimit && (
          <div
            className="border-t px-5 py-6 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            <p className="text-sm font-semibold mb-1">That&apos;s the demo limit.</p>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              Get your own link to finish Lesson 1 — free, no credit card.
            </p>
            <button
              onClick={scrollToWaitlist}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-80 cursor-pointer transition-opacity"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              Get Lesson 1 free →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
