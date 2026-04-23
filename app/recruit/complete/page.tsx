'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function CompleteInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-lg text-center">
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
