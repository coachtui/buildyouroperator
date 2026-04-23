'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

const SHARE_TEXT = `Just finished Recruit on Operator — an AI course taught entirely through conversation. No videos, no slides. Just Gojo asking questions until things actually click.

If you've been meaning to figure out AI for real work, this is how.

buildyouroperator.com`

function CompleteInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(SHARE_TEXT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-12">
          <p className="text-xs tracking-widest uppercase mb-6" style={{ color: 'var(--accent)' }}>Recruit · Complete</p>
          <h1 className="text-4xl font-bold mb-4">You&apos;re not just a user anymore.</h1>
          <p className="text-lg leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
            You went from zero to building real prompts for your actual job. That&apos;s not nothing. Most people never get past watching videos about it.
          </p>
          <p className="text-lg leading-relaxed mb-10" style={{ color: 'var(--muted)' }}>
            Agent is next — built from what you and the other Recruit graduates tell us you needed. You&apos;ll hear about it first.
          </p>
          <button
            onClick={() => router.push(`/?token=${token}`)}
            className="px-8 py-4 rounded-lg text-base font-semibold hover:opacity-80 cursor-pointer transition-opacity"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            See what&apos;s coming →
          </button>
        </div>

        <div className="rounded-xl p-6 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>Know someone who should do this?</p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Copy this and send it to someone who&apos;s been putting off learning AI.
          </p>
          <div
            className="rounded-lg p-4 text-sm leading-relaxed mb-4 whitespace-pre-wrap"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            {SHARE_TEXT}
          </div>
          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer border"
            style={copied
              ? { background: 'transparent', borderColor: 'var(--accent)', color: 'var(--accent)' }
              : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            {copied ? 'Copied ✓' : 'Copy to share'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Complete() {
  return (
    <Suspense>
      <CompleteInner />
    </Suspense>
  )
}
