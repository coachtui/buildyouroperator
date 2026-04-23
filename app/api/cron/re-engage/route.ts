import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/app/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Gojo at Operator <gojo@mail.buildyouroperator.com>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://buildyouroperator.com'

interface UserRow {
  id: string
  email: string
  token: string | null
  current_lesson: number
  created_at: string
}

interface SessionRow {
  user_id: string
  created_at: string
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Day 3 window: signed up 72–96 hours ago
  const day3Start = new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString()
  const day3End = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()

  // Day 7 window: 168–192 hours ago
  const day7Start = new Date(now.getTime() - 192 * 60 * 60 * 1000).toISOString()
  const day7End = new Date(now.getTime() - 168 * 60 * 60 * 1000).toISOString()

  const [{ data: allUsers }, { data: allSessions }] = await Promise.all([
    supabase.from('users').select('id, email, token, current_lesson, created_at'),
    supabase.from('lesson_sessions').select('user_id, created_at'),
  ])

  const users = (allUsers ?? []) as UserRow[]
  const sessions = (allSessions ?? []) as SessionRow[]

  const sessionsByUser: Record<string, string[]> = {}
  for (const s of sessions) {
    if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = []
    sessionsByUser[s.user_id].push(s.created_at)
  }

  const day3Results: string[] = []
  const day7Results: string[] = []

  for (const user of users) {
    if (!user.token) continue
    const userSessions = sessionsByUser[user.id] ?? []
    const lessonUrl = `${BASE_URL}/recruit/1?token=${user.token}`

    // Day 3: signed up in window, no sessions at all
    if (user.created_at >= day3Start && user.created_at < day3End && userSessions.length === 0) {
      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: "You signed up. You haven't started.",
        html: `
          <div style="background:#080808;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;">
            <p style="color:#c9973a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:32px;">Operator</p>
            <h1 style="font-size:24px;font-weight:700;line-height:1.3;margin-bottom:16px;">Lesson 1 is still waiting for you.</h1>
            <p style="color:#888;line-height:1.7;margin-bottom:8px;">
              You signed up three days ago. I haven't heard from you.
            </p>
            <p style="color:#888;line-height:1.7;margin-bottom:32px;">
              It takes about 15 minutes. You don't need to prepare anything. You just need to open it.
            </p>
            <a href="${lessonUrl}" style="display:inline-block;background:#c9973a;color:#000;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
              Start Lesson 1 →
            </a>
            <div style="border-top:1px solid #1a1a1a;padding-top:24px;margin-top:24px;">
              <p style="color:#555;font-size:12px;">Gojo · Operator by AIGA LLC</p>
            </div>
          </div>
        `,
      })
      day3Results.push(user.email)
      continue
    }

    // Day 7: last session activity in window, not completed (current_lesson <= 6)
    if (userSessions.length > 0 && user.current_lesson <= 6) {
      const lastActivity = userSessions.sort().at(-1)!
      if (lastActivity >= day7Start && lastActivity < day7End) {
        const continueUrl = `${BASE_URL}/recruit/${user.current_lesson}?token=${user.token}`
        await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: "You started. You went quiet.",
          html: `
            <div style="background:#080808;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;">
              <p style="color:#c9973a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:32px;">Operator</p>
              <h1 style="font-size:24px;font-weight:700;line-height:1.3;margin-bottom:16px;">You were on to something.</h1>
              <p style="color:#888;line-height:1.7;margin-bottom:8px;">
                You started Lesson ${user.current_lesson > 1 ? user.current_lesson - 1 : 1} a week ago and haven't been back.
              </p>
              <p style="color:#888;line-height:1.7;margin-bottom:32px;">
                Most people stop here. The ones who don't are the ones who actually change how they work. You're closer than you think.
              </p>
              <a href="${continueUrl}" style="display:inline-block;background:#c9973a;color:#000;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
                Pick up where you left off →
              </a>
              <div style="border-top:1px solid #1a1a1a;padding-top:24px;margin-top:24px;">
                <p style="color:#555;font-size:12px;">Gojo · Operator by AIGA LLC</p>
              </div>
            </div>
          `,
        })
        day7Results.push(user.email)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    day3: day3Results.length,
    day7: day7Results.length,
  })
}
