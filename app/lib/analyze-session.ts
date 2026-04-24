import Anthropic from '@anthropic-ai/sdk'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface SessionAnalysis {
  sentiment: 'frustrated' | 'confused' | 'engaged' | 'excited' | 'mixed'
  struggled_with: string | null
  what_clicked: string | null
  gaps_mentioned: string | null
  summary: string
}

const SYSTEM_MESSAGES = ['Begin the lesson.', 'The student is returning.']

export async function analyzeSession(
  messages: Message[],
  lessonNumber: number
): Promise<SessionAnalysis> {
  const client = new Anthropic()

  const realMessages = messages.filter(
    m => !(m.role === 'user' && SYSTEM_MESSAGES.some(s => m.content.startsWith(s)))
  )

  const transcript = realMessages
    .map(m => `${m.role === 'user' ? 'STUDENT' : 'GOJO'}: ${m.content}`)
    .join('\n\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are reviewing a transcript from Lesson ${lessonNumber} of an AI education course. Analyze the student's experience and return a JSON object with exactly these fields:

- sentiment: one of "frustrated", "confused", "engaged", "excited", "mixed"
- struggled_with: the specific concept or moment where the student had difficulty (or null if none)
- what_clicked: the concept or moment where understanding landed (or null if unclear)
- gaps_mentioned: anything the student wanted that wasn't covered (or null if none)
- summary: 2-3 sentence plain-English summary of the session quality and student progression

Return ONLY valid JSON, no markdown, no explanation.

TRANSCRIPT:
${transcript}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    return JSON.parse(text) as SessionAnalysis
  } catch {
    return {
      sentiment: 'mixed',
      struggled_with: null,
      what_clicked: null,
      gaps_mentioned: null,
      summary: 'Analysis parsing failed.',
    }
  }
}
