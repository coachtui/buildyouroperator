import { supabase } from '@/app/lib/supabase'

interface User {
  id: string
  email: string
  tier: string
  current_lesson: number
  created_at: string
}

interface LessonSession {
  user_id: string
  lesson_number: number
  messages: unknown[]
  completed_at: string | null
  created_at: string
}

interface LessonAnalysis {
  user_id: string
  lesson_number: number
  sentiment: string
  struggled_with: string | null
  what_clicked: string | null
  gaps_mentioned: string | null
  summary: string
  updated_at: string
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>
}) {
  const { key } = await searchParams

  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return (
      <div style={{ background: '#080808', color: '#f0f0f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <p style={{ color: '#555' }}>403</p>
      </div>
    )
  }

  const [{ data: users }, { data: sessions }, { data: analyses }] = await Promise.all([
    supabase.from('users').select('id, email, tier, current_lesson, created_at').order('created_at', { ascending: false }),
    supabase.from('lesson_sessions').select('user_id, lesson_number, messages, completed_at, created_at').order('created_at', { ascending: false }),
    supabase.from('lesson_analyses').select('user_id, lesson_number, sentiment, struggled_with, what_clicked, gaps_mentioned, summary, updated_at').order('updated_at', { ascending: false }),
  ])

  const userList = (users ?? []) as User[]
  const sessionList = (sessions ?? []) as LessonSession[]

  const total = userList.length
  const byTier = userList.reduce<Record<string, number>>((acc, u) => {
    acc[u.tier] = (acc[u.tier] ?? 0) + 1
    return acc
  }, {})

  // Lesson funnel: how many users started each lesson
  const startedByLesson: Record<number, number> = {}
  const completedByLesson: Record<number, number> = {}
  for (const s of sessionList) {
    startedByLesson[s.lesson_number] = (startedByLesson[s.lesson_number] ?? 0) + 1
    if (s.completed_at) {
      completedByLesson[s.lesson_number] = (completedByLesson[s.lesson_number] ?? 0) + 1
    }
  }

  // Last activity per user
  const lastActivity: Record<string, string> = {}
  for (const s of sessionList) {
    if (!lastActivity[s.user_id] || s.created_at > lastActivity[s.user_id]) {
      lastActivity[s.user_id] = s.created_at
    }
  }

  // Message counts per user across all sessions
  const msgCounts: Record<string, number> = {}
  for (const s of sessionList) {
    const real = (s.messages as { role: string; content: string }[]).filter(
      m => m.role === 'user' && m.content !== 'Begin the lesson.' && !m.content.startsWith('The student is returning.')
    ).length
    msgCounts[s.user_id] = (msgCounts[s.user_id] ?? 0) + real
  }

  const analysisList = (analyses ?? []) as LessonAnalysis[]

  // Sentiment counts per lesson
  const sentimentByLesson: Record<number, Record<string, number>> = {}
  for (const a of analysisList) {
    if (!sentimentByLesson[a.lesson_number]) sentimentByLesson[a.lesson_number] = {}
    sentimentByLesson[a.lesson_number][a.sentiment] = (sentimentByLesson[a.lesson_number][a.sentiment] ?? 0) + 1
  }

  const usersWithSessions = new Set(sessionList.map(s => s.user_id))
  const neverStarted = userList.filter(u => !usersWithSessions.has(u.id))

  const cell: React.CSSProperties = { padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontSize: 13, whiteSpace: 'nowrap' }
  const dim: React.CSSProperties = { color: '#555' }
  const accent: React.CSSProperties = { color: '#c9973a' }

  return (
    <div style={{ background: '#080808', color: '#f0f0f0', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '40px 32px' }}>
      <p style={{ ...accent, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>Operator · Admin</p>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
        {[
          { label: 'Total users', value: total },
          { label: 'Never started', value: neverStarted.length },
          { label: 'Spots left', value: Math.max(0, 50 - total) },
          { label: 'Recruit', value: byTier['recruit'] ?? 0 },
          { label: 'Agent', value: byTier['agent'] ?? 0 },
          { label: 'Operator', value: byTier['operator'] ?? 0 },
          { label: 'Bundle', value: byTier['bundle'] ?? 0 },
        ].map(s => (
          <div key={s.label} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, padding: '16px 24px', minWidth: 100 }}>
            <p style={{ ...dim, fontSize: 11, marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lesson funnel */}
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#888' }}>Lesson Funnel</h2>
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, marginBottom: 40, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#111' }}>
              {['Lesson', 'Started', 'Completed', 'Completion rate'].map(h => (
                <th key={h} style={{ ...cell, ...dim, fontWeight: 500, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map(n => {
              const started = startedByLesson[n] ?? 0
              const completed = completedByLesson[n] ?? 0
              const rate = started > 0 ? Math.round((completed / started) * 100) : 0
              return (
                <tr key={n}>
                  <td style={cell}>Lesson {n}</td>
                  <td style={cell}>{started}</td>
                  <td style={cell}>{completed}</td>
                  <td style={cell}>{started > 0 ? `${rate}%` : <span style={dim}>—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Never started */}
      {neverStarted.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#888' }}>Never Started</h2>
          <p style={{ ...dim, fontSize: 12, marginBottom: 16 }}>Signed up but opened zero lessons — re-engagement targets.</p>
          <div style={{ background: '#0f0f0f', border: '1px solid #2a1a0a', borderRadius: 8, marginBottom: 40, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr style={{ background: '#111' }}>
                  {['Email', 'Tier', 'Joined'].map(h => (
                    <th key={h} style={{ ...cell, ...dim, fontWeight: 500, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {neverStarted.map(u => (
                  <tr key={u.id}>
                    <td style={cell}>{u.email}</td>
                    <td style={{ ...cell, ...accent }}>{u.tier}</td>
                    <td style={{ ...cell, ...dim }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Session Insights */}
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#888' }}>Session Insights</h2>
      <p style={{ ...dim, fontSize: 12, marginBottom: 16 }}>AI analysis of each completed lesson — sentiment, struggles, what landed, gaps.</p>

      {analysisList.length === 0 ? (
        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, padding: '24px', marginBottom: 40, ...dim, fontSize: 13 }}>
          No analyses yet — they generate automatically when students complete lessons.
        </div>
      ) : (
        <>
          {/* Sentiment by lesson */}
          <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111' }}>
                  {['Lesson', 'Analyses', 'Engaged', 'Excited', 'Mixed', 'Confused', 'Frustrated'].map(h => (
                    <th key={h} style={{ ...cell, ...dim, fontWeight: 500, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map(n => {
                  const s = sentimentByLesson[n] ?? {}
                  const total = Object.values(s).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={n}>
                      <td style={cell}>Lesson {n}</td>
                      <td style={cell}>{total > 0 ? total : <span style={dim}>—</span>}</td>
                      <td style={{ ...cell, color: total > 0 ? '#4ade80' : '#555' }}>{s['engaged'] ?? 0}</td>
                      <td style={{ ...cell, color: total > 0 ? '#86efac' : '#555' }}>{s['excited'] ?? 0}</td>
                      <td style={{ ...cell, color: total > 0 ? '#fbbf24' : '#555' }}>{s['mixed'] ?? 0}</td>
                      <td style={{ ...cell, color: total > 0 ? '#f97316' : '#555' }}>{s['confused'] ?? 0}</td>
                      <td style={{ ...cell, color: total > 0 ? '#f87171' : '#555' }}>{s['frustrated'] ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Recent analyses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
            {analysisList.slice(0, 20).map((a, i) => {
              const sentimentColor: Record<string, string> = {
                engaged: '#4ade80', excited: '#86efac', mixed: '#fbbf24', confused: '#f97316', frustrated: '#f87171'
              }
              const user = userList.find(u => u.id === a.user_id)
              return (
                <div key={i} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Lesson {a.lesson_number}</span>
                    <span style={{ fontSize: 11, color: sentimentColor[a.sentiment] ?? '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{a.sentiment}</span>
                    <span style={{ ...dim, fontSize: 11 }}>{user?.email ?? a.user_id.slice(0, 8)}</span>
                    <span style={{ ...dim, fontSize: 11, marginLeft: 'auto' }}>{new Date(a.updated_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: a.struggled_with || a.what_clicked || a.gaps_mentioned ? 10 : 0 }}>{a.summary}</p>
                  {(a.struggled_with || a.what_clicked || a.gaps_mentioned) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10, borderTop: '1px solid #1a1a1a' }}>
                      {a.struggled_with && <p style={{ fontSize: 11 }}><span style={dim}>Struggled: </span>{a.struggled_with}</p>}
                      {a.what_clicked && <p style={{ fontSize: 11 }}><span style={dim}>Clicked: </span>{a.what_clicked}</p>}
                      {a.gaps_mentioned && <p style={{ fontSize: 11 }}><span style={{ color: '#f97316' }}>Gap: </span>{a.gaps_mentioned}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* User table */}
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#888' }}>Users</h2>
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#111' }}>
              {['Email', 'Tier', 'On lesson', 'Messages', 'Last active', 'Joined'].map(h => (
                <th key={h} style={{ ...cell, ...dim, fontWeight: 500, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {userList.map(u => {
              const last = lastActivity[u.id]
              const msgs = msgCounts[u.id] ?? 0
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={cell}>{u.email}</td>
                  <td style={{ ...cell, ...accent }}>{u.tier}</td>
                  <td style={cell}>{u.current_lesson}</td>
                  <td style={cell}>{msgs > 0 ? msgs : <span style={dim}>0</span>}</td>
                  <td style={{ ...cell, ...dim }}>{last ? new Date(last).toLocaleDateString() : '—'}</td>
                  <td style={{ ...cell, ...dim }}>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              )
            })}
            {userList.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...cell, ...dim, textAlign: 'center', padding: 32 }}>No users yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
