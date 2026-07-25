import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { jwtVerify } from 'jose'
import { supabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const { token, lesson } = await req.json()

  if (!token || !lesson) {
    return NextResponse.json({ error: 'Missing params.' }, { status: 400 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const email = payload.email as string

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const lessonNumber = parseInt(lesson)

    await Promise.all([
      supabase
        .from('lesson_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('lesson_number', lessonNumber)
        .is('completed_at', null),

      supabase
        .from('users')
        .update({ current_lesson: lessonNumber + 1 })
        .eq('id', user.id),
    ])

    // Analysis + profile extraction run in a separate invocation, dispatched
    // after the response so serverless can't kill the request mid-send.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin
    after(async () => {
      await fetch(`${baseUrl}/api/analyze-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, lesson_number: lessonNumber }),
      }).catch(err => console.error('analyze-lesson dispatch failed:', err))
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed.' }, { status: 500 })
  }
}
