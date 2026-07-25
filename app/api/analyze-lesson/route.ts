import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { analyzeSession } from '@/app/lib/analyze-session'
import { extractStudentProfile, StudentProfile } from '@/app/lib/student-profile'

export async function POST(req: NextRequest) {
  const { user_id, lesson_number } = await req.json()

  if (!user_id || !lesson_number) {
    return NextResponse.json({ error: 'Missing params.' }, { status: 400 })
  }

  try {
    const [{ data: session }, { data: userRow }] = await Promise.all([
      supabase
        .from('lesson_sessions')
        .select('messages')
        .eq('user_id', user_id)
        .eq('lesson_number', lesson_number)
        .single(),
      supabase.from('users').select('*').eq('id', user_id).single(),
    ])

    if (!session?.messages || (session.messages as unknown[]).length === 0) {
      return NextResponse.json({ error: 'No session data.' }, { status: 404 })
    }

    const messages = session.messages as { role: 'user' | 'assistant'; content: string }[]
    const existingProfile = (userRow?.student_profile ?? null) as StudentProfile | null

    // Session analysis (Sonnet) and profile extraction (Haiku) are independent —
    // either failing must not block the other.
    const [analysisResult, profileResult] = await Promise.allSettled([
      analyzeSession(messages, lesson_number),
      extractStudentProfile(messages, lesson_number, existingProfile),
    ])

    if (analysisResult.status === 'fulfilled') {
      const analysis = analysisResult.value
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
    } else {
      console.error('session analysis failed:', analysisResult.reason)
    }

    if (profileResult.status === 'fulfilled' && profileResult.value) {
      const { error } = await supabase
        .from('users')
        .update({ student_profile: profileResult.value })
        .eq('id', user_id)
      if (error) console.error('student_profile write failed (run phase3 migration?):', error.message)
    } else if (profileResult.status === 'rejected') {
      console.error('profile extraction failed:', profileResult.reason)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('analyze-lesson error:', err)
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 500 })
  }
}
