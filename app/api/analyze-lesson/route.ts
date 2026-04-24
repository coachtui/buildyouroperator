import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { analyzeSession } from '@/app/lib/analyze-session'

export async function POST(req: NextRequest) {
  const { user_id, lesson_number } = await req.json()

  if (!user_id || !lesson_number) {
    return NextResponse.json({ error: 'Missing params.' }, { status: 400 })
  }

  try {
    const { data: session } = await supabase
      .from('lesson_sessions')
      .select('messages')
      .eq('user_id', user_id)
      .eq('lesson_number', lesson_number)
      .single()

    if (!session?.messages || (session.messages as unknown[]).length === 0) {
      return NextResponse.json({ error: 'No session data.' }, { status: 404 })
    }

    const analysis = await analyzeSession(
      session.messages as { role: 'user' | 'assistant'; content: string }[],
      lesson_number
    )

    await supabase.from('lesson_analyses').upsert(
      {
        user_id,
        lesson_number,
        sentiment: analysis.sentiment,
        struggled_with: analysis.struggled_with,
        what_clicked: analysis.what_clicked,
        gaps_mentioned: analysis.gaps_mentioned,
        summary: analysis.summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_number' }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('analyze-lesson error:', err)
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 500 })
  }
}
