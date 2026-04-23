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

  const [{ data: users }, { data: sessions }] = await Promise.all([
    supabase.from('users').select('id, email, tier, current_lesson, created_at').order('created_at', { ascending: false }),
    supabase.from('lesson_sessions').select('user_id, lesson_number, messages, completed_at, created_at').order('created_at', { ascending: false }),
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
