'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface LessonConfig {
  number: number
  total: number
  title: string
}

function storageKey(token: string, lesson: number) {
  return `operator_lesson${lesson}_${token.slice(-12)}`
}

function loadSession(token: string, lesson: number): { messages: Message[]; started: boolean } | null {
  try {
    const raw = localStorage.getItem(storageKey(token, lesson))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(token: string, lesson: number, messages: Message[], started: boolean) {
  try {
    localStorage.setItem(storageKey(token, lesson), JSON.stringify({ messages, started }))
  } catch {}
}

const SYSTEM_MESSAGES = [
  'Begin the lesson.',
  'The student is returning.',
]

export default function LessonPage({ lesson }: { lesson: LessonConfig }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [maxLesson, setMaxLesson] = useState<number>(6)
  const [resuming, setResuming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!token) { setAuthorized(false); return }
    fetch('/api/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(async r => {
      if (!r.ok) { setAuthorized(false); return }
      const authData = await r.json()
      setMaxLesson(authData.maxLesson ?? 6)
      if (lesson.number > (authData.maxLesson ?? 6)) { setAuthorized(false); return }
      setAuthorized(true)

      // Try Supabase first, fall back to localStorage
      const dbRes = await fetch(`/api/session?token=${encodeURIComponent(token)}&lesson=${lesson.number}`)
      const dbData = await dbRes.json()

      if (dbData.messages && dbData.messages.length > 0) {
        setMessages(dbData.messages)
        setStarted(true)
        setResuming(true)
      } else {
        const saved = loadSession(token, lesson.number)
        if (saved && saved.messages.length > 0) {
          setMessages(saved.messages)
          setStarted(true)
          setResuming(true)
        }
      }
    })
  }, [token, lesson.number])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (token && started) saveSession(token, lesson.number, messages, started)
  }, [messages, started, token, lesson.number])

  useEffect(() => {
    if (!resuming || messages.length === 0) return
    setResuming(false)
    const lastGojo = [...messages].reverse().find(m => m.role === 'assistant')
    const checkpoint = lastGojo?.content ?? 'the previous session'
    const resumeMsg: Message = {
      role: 'user',
      content: `The student is returning. Your last message to them was: "${checkpoint.slice(0, 300)}". Welcome them back in one sentence, summarize where they left off, and ask if they have questions before continuing.`
    }
    setLoading(true)
    streamResponse([resumeMsg]).then(() => setLoading(false))
  }, [resuming]) // eslint-disable-line react-hooks/exhaustive-deps

  async function startLesson() {
    setStarted(true)
    setLoading(true)
    await streamResponse([{ role: 'user', content: 'Begin the lesson.' }])
    setLoading(false)
  }

  async function streamResponse(payload: Message[]) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload, lesson: String(lesson.number), token }),
    })

    if (!res.ok || !res.body) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong on my end. Give it a moment and try again.' }])
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

  async function handleSend() {
    if (!input.trim() || loading) return
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

  const visibleMessages = messages.filter(
    m => !(m.role === 'user' && SYSTEM_MESSAGES.some(s => m.content.startsWith(s)))
  )

  if (authorized === null) {
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

  if (!authorized) {
    const isPaidGate = lesson.number > maxLesson
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="max-w-md text-center">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>Operator</p>
          <h1 className="text-2xl font-bold mb-4">{isPaidGate ? 'Unlock the full course' : 'Access required'}</h1>
          <p className="mb-8 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {isPaidGate
              ? 'Lessons 2–6 are part of the Recruit tier. Join as a founding member to continue.'
              : 'This lesson requires a valid access link. Join the waitlist to get Lesson 1 free.'}
          </p>
          <button onClick={() => router.push('/')} className="px-6 py-3 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#000' }}>
            {isPaidGate ? 'See pricing →' : 'Back to home'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>Operator</span>
          <span className="text-xs" style={{ color: 'var(--border)' }}>|</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Recruit · Lesson {lesson.number} of {lesson.total}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{lesson.title}</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full">
        {!started ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6">
            <div>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>
                Recruit · Lesson {lesson.number}
              </p>
              <h1 className="text-3xl font-bold mb-3">{lesson.title}</h1>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--muted)' }}>
                This isn&apos;t a video. It&apos;s a conversation. Gojo will ask you questions, correct your thinking, and won&apos;t move on until you get it.
              </p>
            </div>
            <button onClick={startLesson} className="px-8 py-3 rounded-lg text-sm font-semibold hover:opacity-80 cursor-pointer transition-opacity" style={{ background: 'var(--accent)', color: '#000' }}>
              Start Lesson {lesson.number}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1" style={{ background: 'var(--accent)', color: '#000' }}>G</div>
                )}
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%]"
                  style={{
                    background: msg.role === 'user' ? 'var(--surface)' : 'rgba(201,151,58,0.1)',
                    border: `1px solid ${msg.role === 'user' ? 'var(--border)' : 'rgba(201,151,58,0.2)'}`,
                    color: 'var(--foreground)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>Y</div>
                )}
              </div>
            ))}
            {loading && visibleMessages[visibleMessages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent)', color: '#000' }}>G</div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(201,151,58,0.1)', border: '1px solid rgba(201,151,58,0.2)' }}>
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {started && (
        <div className="border-t px-4 py-4 shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply to Gojo..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none border disabled:opacity-50"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)', maxHeight: '120px' }}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()} className="px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 hover:opacity-80 cursor-pointer transition-opacity shrink-0" style={{ background: 'var(--accent)', color: '#000' }}>
              Send
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--muted)' }}>Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  )
}
