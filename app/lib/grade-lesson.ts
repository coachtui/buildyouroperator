import Anthropic from '@anthropic-ai/sdk'
import { LESSON_GOALS } from './lesson-goals'

export interface GradeMessage {
  role: 'user' | 'assistant'
  content: string
}

const MODEL = 'claude-haiku-4-5'
const MAX_OUTPUT_TOKENS = 256

/** Synthetic turns the client never shows; excluded from the graded transcript. */
const SYSTEM_MESSAGES = ['Begin the lesson.', 'The student is returning.']

/**
 * Below this, no real exchange has happened yet — not a count of student
 * turns specifically. Counts real messages from both roles (assistant +
 * student), so a single question-and-answer pair already clears the gate.
 */
export const MIN_MESSAGES_TO_GRADE = 2

const NEWLY_MET_SCHEMA = {
  type: 'object',
  properties: {
    newly_met: {
      type: 'array',
      items: { type: 'integer' },
      description:
        'Ids of goals that are now met and were not already met. Empty array if none.',
    },
  },
  required: ['newly_met'],
  additionalProperties: false,
}

function isSystemMessage(content: string) {
  return SYSTEM_MESSAGES.some(s => content.startsWith(s))
}

function realTranscript(messages: GradeMessage[]) {
  return messages
    .filter(m => !(m.role === 'user' && isSystemMessage(m.content)))
    .map(m => `${m.role === 'user' ? 'STUDENT' : 'GOJO'}: ${m.content}`)
    .join('\n\n')
}

/**
 * Decides which not-yet-met goals the transcript now shows evidence for.
 * Returns [] on any failure — the grader must never block a lesson.
 */
export async function gradeLesson(
  messages: GradeMessage[],
  lessonKey: string,
  alreadyMet: number[]
): Promise<number[]> {
  const goals = LESSON_GOALS[lessonKey] ?? []
  const unmet = goals.filter(g => !alreadyMet.includes(g.id))
  if (unmet.length === 0) return []

  const realMessageCount = messages.filter(
    m => !(m.role === 'user' && isSystemMessage(m.content))
  ).length
  if (realMessageCount < MIN_MESSAGES_TO_GRADE) return []

  // Ids stay global — never renumbered for the shrunken unmet set.
  const rubric = unmet.map(g => `${g.id}. ${g.criterion}`).join('\n')

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: {
        format: { type: 'json_schema', schema: NEWLY_MET_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `You are grading a student's progress through Lesson ${lessonKey} of a conversational AI course. The teacher is called Gojo.

Below are the lesson goals NOT yet marked met. For each, decide whether the transcript contains clear evidence the student has met it.

Rules:
- Grade the STUDENT, not the teacher. Evidence must come from what the student said or did. Gojo asserting something, or the student replying "yeah" / "makes sense" / "ok", is NOT evidence.
- A goal that asks for a "concrete" insight, example, or moment requires the student to describe a specific real situation — a task they tried, a message they wrote, a result they got, something dated or nameable. A generic acknowledgment like "my vague requests were the problem" or "that makes more sense now", with no specific situation attached, is NOT concrete — it does not satisfy a separate "concrete insight" goal, even if it also happens to satisfy a different, more general goal.
- Be strict. If you are unsure, do not mark it met.
- A goal marked met can never be undone, so a wrong "met" is worse than a missed one.
- Only return ids from the list below.

GOALS NOT YET MET:
${rubric}

TRANSCRIPT:
${realTranscript(messages)}

Return the ids of goals now met. Return an empty array if none are.`,
        },
      ],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as { newly_met?: unknown }
    if (!Array.isArray(parsed.newly_met)) return []

    const validIds = new Set(unmet.map(g => g.id))
    return parsed.newly_met.filter(
      (id): id is number => typeof id === 'number' && validIds.has(id)
    )
  } catch (err) {
    console.error('gradeLesson failed:', err instanceof Error ? err.message : err)
    return []
  }
}

/** The `graderState` block injected into Gojo's system prompt. */
export function formatGraderState(
  lessonKey: string,
  met: number[],
  softUnlocked: boolean
): string | undefined {
  const goals = LESSON_GOALS[lessonKey] ?? []
  if (goals.length === 0) return undefined

  const unmet = goals.filter(g => !met.includes(g.id))
  const lines: string[] = []

  lines.push(met.length > 0 ? `Met: ${met.join(', ')}` : `Met: none yet`)

  if (unmet.length === 0) {
    lines.push(`All goals met. Close the lesson when it feels natural.`)
  } else {
    lines.push(`Not yet met:`)
    lines.push(unmet.map(g => `${g.id}. ${g.criterion}`).join('\n'))
  }

  if (softUnlocked && unmet.length > 0) {
    lines.push(
      `This student has been working a long time and has now been given the option to move on regardless. Do not keep pushing on the unmet goals. Give them one useful thing they can take with them and close warmly.`
    )
  }

  return lines.join('\n')
}
