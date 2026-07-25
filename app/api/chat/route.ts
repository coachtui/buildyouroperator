import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { after } from 'next/server'
import { jwtVerify, JWTPayload } from 'jose'
import { supabase } from '@/app/lib/supabase'
import { composeLessonPrompt, PromptContext } from '@/app/lib/lesson-prompts'
import {
  StudentProfile,
  LessonAnalysisRow,
  formatStudentProfile,
  formatPriorAnalysis,
} from '@/app/lib/student-profile'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 512

const MESSAGE_LIMIT_PER_LESSON = 30
const MESSAGE_LIMIT_DEMO = 8
const MAX_MESSAGE_CHARS = 2000
// Spend controls: bounds worst-case per-user daily cost regardless of per-lesson limits.
const DAILY_MESSAGE_LIMIT = parseInt(process.env.DAILY_MESSAGE_LIMIT ?? '100')
const PAUSED_MESSAGE = `Lessons are paused for a moment while we work on the system. Check back shortly — your progress is saved.`
// Demo mode is stateless (no DB user), so it accepts client history — bounded hard.
const DEMO_MAX_HISTORY_ENTRIES = 24
const DEMO_MAX_TOTAL_CHARS = 20000

const RECRUIT_LESSONS = new Set(['1', '2', '3', '4', '5', '6'])

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function verifyToken(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

function isSystemMessage(content: string) {
  return content === 'Begin the lesson.' || content.startsWith('The student is returning.')
}

function countRealUserMessages(messages: ChatMessage[]) {
  return messages.filter(m => m.role === 'user' && !isSystemMessage(m.content)).length
}

function resumeMessage(history: ChatMessage[]): string {
  const lastGojo = [...history].reverse().find(m => m.role === 'assistant')
  const checkpoint = (lastGojo?.content ?? 'the previous session').slice(0, 300)
  return `The student is returning. Your last message to them was: "${checkpoint}". Welcome them back in one sentence, summarize where they left off, and ask if they have questions before continuing.`
}

function textResponse(text: string, status = 200) {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

function streamLesson(
  systemPrompt: string,
  history: ChatMessage[],
  onComplete?: (assistantText: string, usage: TokenUsage) => Promise<void>
) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemPrompt,
    messages: history,
  })

  const encoder = new TextEncoder()
  let resolveDone!: (result: { text: string; usage: TokenUsage }) => void
  const done = new Promise<{ text: string; usage: TokenUsage }>(r => { resolveDone = r })

  const readable = new ReadableStream({
    async start(controller) {
      const chunks: string[] = []
      const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            chunks.push(chunk.delta.text)
            controller.enqueue(encoder.encode(chunk.delta.text))
          } else if (chunk.type === 'message_start') {
            usage.inputTokens = chunk.message.usage.input_tokens
          } else if (chunk.type === 'message_delta' && chunk.usage) {
            usage.outputTokens = chunk.usage.output_tokens
          }
        }
      } catch {
        // Partial output still gets persisted below; the client shows a retry message.
      } finally {
        controller.close()
        resolveDone({ text: chunks.join(''), usage })
      }
    },
  })

  if (onComplete) {
    after(async () => {
      const { text, usage } = await done
      if (text) await onComplete(text, usage)
    })
  }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}

/** Landing-page demo: shared token, no DB user. Client history allowed but tightly bounded. */
function handleDemo(rawHistory: unknown, message: unknown, systemPrompt: string) {
  const history: ChatMessage[] = Array.isArray(rawHistory)
    ? rawHistory
        .slice(0, DEMO_MAX_HISTORY_ENTRIES)
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.length <= MAX_MESSAGE_CHARS
        )
    : []

  if (typeof message === 'string' && message.trim()) {
    if (message.length > MAX_MESSAGE_CHARS) {
      return textResponse('Message too long.', 400)
    }
    history.push({ role: 'user', content: message.trim() })
  }
  // The client never stores the opening synthetic turn, so the history must be
  // re-anchored: Anthropic requires the first message to be from the user.
  if (history.length === 0 || history[0].role === 'assistant') {
    history.unshift({ role: 'user', content: 'Begin the lesson.' })
  }

  // Client-supplied history can't be trusted to alternate roles — merge repeats.
  const normalized: ChatMessage[] = []
  for (const m of history) {
    const last = normalized[normalized.length - 1]
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`
    } else {
      normalized.push({ ...m })
    }
  }
  history.length = 0
  history.push(...normalized)

  const totalChars = history.reduce((sum, m) => sum + m.content.length, 0)
  if (totalChars > DEMO_MAX_TOTAL_CHARS) {
    return textResponse('Demo limit reached.', 429)
  }
  if (countRealUserMessages(history) > MESSAGE_LIMIT_DEMO) {
    return textResponse(
      `That's the demo limit. Get your own free link at https://buildyouroperator.com`,
      429
    )
  }

  return streamLesson(systemPrompt, history)
}

export async function POST(req: NextRequest) {
  // Kill switch: set CHAT_PAUSED=true (and redeploy) to stop all Anthropic spend.
  if (process.env.CHAT_PAUSED === 'true') {
    return textResponse(PAUSED_MESSAGE, 503)
  }

  const body = await req.json().catch(() => null)
  if (!body) return textResponse('Bad request', 400)

  const { action, message, lesson, token, history } = body as {
    action?: 'start' | 'resume' | 'message'
    message?: unknown
    lesson?: string
    token?: string
    history?: unknown
  }

  const payload = await verifyToken(token)
  if (!payload) return textResponse('Unauthorized', 401)

  const lessonKey = lesson && RECRUIT_LESSONS.has(lesson) ? lesson : '1'
  const lessonNumber = parseInt(lessonKey)
  if (!composeLessonPrompt(lessonKey)) return textResponse('Unknown lesson', 400)

  // Demo tokens never touch the DB — bounded stateless path, Lesson 1 only.
  if (payload.demo === true) {
    return handleDemo(history, message, composeLessonPrompt('1')!)
  }

  // DB is authoritative for access level — JWT only identifies the user.
  // select('*') so the route keeps working before the student_profile migration.
  const email = payload.email as string
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (!user) return textResponse('Unauthorized', 401)

  // Daily cap across all lessons. Fails open if the chat_usage table isn't
  // migrated yet — per-lesson limits still bound each conversation.
  const today = new Date().toISOString().slice(0, 10)
  const { data: usageRow, error: usageError } = await supabase
    .from('chat_usage')
    .select('message_count')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle()
  if (usageError) {
    console.error('chat_usage read failed (run phase2 migration?):', usageError.message)
  } else if ((usageRow?.message_count ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return textResponse(
      `That's a full day of lessons — seriously. Come back tomorrow and pick up where you left off. Your progress is saved.`,
      429
    )
  }

  // Server-owned history: the client never supplies the conversation.
  const [{ data: existingSession }, priorAnalysisResult] = await Promise.all([
    supabase
      .from('lesson_sessions')
      .select('id, messages')
      .eq('user_id', user.id)
      .eq('lesson_number', lessonNumber)
      .single(),
    lessonNumber > 1
      ? supabase
          .from('lesson_analyses')
          .select('lesson_number, sentiment, struggled_with, what_clicked, summary')
          .eq('user_id', user.id)
          .eq('lesson_number', lessonNumber - 1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Cross-lesson memory: profile + previous lesson's analysis shape the prompt.
  const promptCtx: PromptContext = {}
  const profile = (user.student_profile ?? null) as StudentProfile | null
  if (profile) {
    const formatted = formatStudentProfile(profile)
    if (formatted) promptCtx.studentProfile = formatted
  }
  const priorAnalysis = priorAnalysisResult.data as LessonAnalysisRow | null
  if (priorAnalysis) promptCtx.priorAnalysis = formatPriorAnalysis(priorAnalysis)

  const systemPrompt = composeLessonPrompt(lessonKey, promptCtx)!

  const storedMessages: ChatMessage[] = Array.isArray(existingSession?.messages)
    ? (existingSession!.messages as ChatMessage[])
    : []

  const realCount = countRealUserMessages(storedMessages)

  if (realCount >= MESSAGE_LIMIT_PER_LESSON) {
    return textResponse(
      `You've covered everything this lesson has for you. Use the Continue button to move to the next lesson.`,
      429
    )
  }

  // Build the turn to append, server-side.
  const chatHistory = [...storedMessages]
  if (action === 'message') {
    if (typeof message !== 'string' || !message.trim()) {
      return textResponse('Message required', 400)
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return textResponse('Message too long.', 400)
    }
    appendUserTurn(chatHistory, message.trim())
  } else if (action === 'resume' || (action === 'start' && chatHistory.length > 0)) {
    if (chatHistory.length === 0) {
      appendUserTurn(chatHistory, 'Begin the lesson.')
    } else {
      appendUserTurn(chatHistory, resumeMessage(chatHistory))
    }
  } else if (action === 'start') {
    appendUserTurn(chatHistory, 'Begin the lesson.')
  } else {
    return textResponse('Unknown action', 400)
  }

  const existingSessionId = existingSession?.id ?? null

  return streamLesson(systemPrompt, chatHistory, async (assistantText, usage) => {
    const { error: usageRpcError } = await supabase.rpc('increment_chat_usage', {
      p_user_id: user.id,
      p_messages: 1,
      p_input_tokens: usage.inputTokens,
      p_output_tokens: usage.outputTokens,
    })
    if (usageRpcError) {
      console.error('chat_usage increment failed (run phase2 migration?):', usageRpcError.message)
    }

    const fullMessages = [...chatHistory, { role: 'assistant', content: assistantText }]
    if (existingSessionId) {
      const { error } = await supabase
        .from('lesson_sessions')
        .update({ messages: fullMessages })
        .eq('id', existingSessionId)
      if (error) console.error('session update failed:', error.message)
    } else {
      // Insert-then-update instead of upsert: works with or without the
      // (user_id, lesson_number) unique constraint being applied yet.
      const { error } = await supabase
        .from('lesson_sessions')
        .insert({ user_id: user.id, lesson_number: lessonNumber, messages: fullMessages })
      if (error) {
        const { error: updateError } = await supabase
          .from('lesson_sessions')
          .update({ messages: fullMessages })
          .eq('user_id', user.id)
          .eq('lesson_number', lessonNumber)
        if (updateError) console.error('session persist failed:', updateError.message)
      }
    }
  })
}

// The Anthropic API requires alternating roles; merge if the last turn was also the user's
// (possible when a previous stream died before the assistant reply was persisted).
function appendUserTurn(history: ChatMessage[], content: string) {
  const last = history[history.length - 1]
  if (last && last.role === 'user') {
    last.content = `${last.content}\n\n${content}`
  } else {
    history.push({ role: 'user', content })
  }
}
