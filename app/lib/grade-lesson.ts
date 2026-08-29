import Anthropic from '@anthropic-ai/sdk'
import { LESSON_GOALS } from './lesson-goals'

export interface GradeMessage {
  role: 'user' | 'assistant'
  content: string
}

const MODEL = 'claude-haiku-4-5'
const MAX_OUTPUT_TOKENS = 1500

/** Synthetic turns the client never shows; excluded from the graded transcript. */
const SYSTEM_MESSAGES = ['Begin the lesson.', 'The student is returning.']

/**
 * Below this, no real exchange has happened yet — not a count of student
 * turns specifically. Counts real messages from both roles (assistant +
 * student), so a single question-and-answer pair already clears the gate.
 */
export const MIN_MESSAGES_TO_GRADE = 2

// Each met goal must carry the student sentence that proves it. Requiring the
// quote is what keeps the grader honest — an id with no quotable evidence
// can't be returned at all.
const NEWLY_MET_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: {
      type: 'string',
      description:
        'Working notes, one short line per goal: met or not, and why. Keep it terse.',
    },
    newly_met: {
      type: 'array',
      description:
        'Goals that are now met and were not already met. Empty array if none.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          evidence: {
            type: 'string',
            description:
              'The exact student sentence from the transcript that meets this goal, quoted verbatim.',
          },
        },
        required: ['id', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['reasoning', 'newly_met'],
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
      temperature: 0,
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
- A goal that requires the student to DO something in the conversation — write or rewrite something, run something, produce something, name a specific plan — is met only when the transcript contains the thing itself: the actual rewritten text, the actual reported result, the actual named plan. The student describing what they WOULD write, understanding what it should contain, or promising to do it, is NOT the thing. Doing it is.
- The artifact must be the exact thing the goal names. An analogy, or an example from a different domain (how they'd brief a person, a comparison to their own trade), shows understanding but is not the artifact — if the goal says they rewrite their own AI instruction, only an actual rewritten AI instruction counts.
- Every goal you return must carry, as evidence, the exact sentence that meets it, quoted verbatim from the transcript. Normally that sentence must be the student's. The exception: a goal whose wording names the teacher's action ("you recommend...", "together you...") is graded on whoever the goal assigns the action to — a goal describing only the teacher's action is met by Gojo's quoted turn alone, and a joint goal needs each side's own words for its own half. If no quotable sentence meets the goal, the goal is not met — never credit a goal because the student "would clearly agree" or because it fits the spirit of the conversation.
- A goal about what the student WANTS to do or build next is about the future. A past accomplishment, however impressive, is not evidence for it — the quote must express the forward-looking intent.
- A goal with a number in it ("at least 2", "three steps") is met only if you can count that many distinct items in the transcript. Count them. One item plus the intent to make more ("I could make another one later") is one item, not two — future intent never counts toward the number.
- A goal that requires the student to know or use a specific term is met only after that term has actually appeared in the conversation and the student has shown they understand it. If the term has not come up yet, the goal cannot be met, no matter how well the student understands the underlying concept.
- A goal that the student "understands" or "knows" something is met only when the student states that thing, in their own words. Doing something merely consistent with the understanding — building a specific prompt, making a good choice — is not stating it.
- Be strict. If you are unsure, do not mark it met. Meeting a goal one turn late is fine; marking it early defeats the purpose of the lesson.
- A goal marked met can never be undone, so a wrong "met" is worse than a missed one.
- Only return ids from the list below.

GOALS NOT YET MET:
${rubric}

TRANSCRIPT:
${realTranscript(messages)}

Return the goals now met, each with its verbatim student-sentence evidence. Return an empty array if none are.`,
        },
      ],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as { newly_met?: unknown }
    if (!Array.isArray(parsed.newly_met)) return []

    const validIds = new Set(unmet.map(g => g.id))
    return parsed.newly_met
      .map(item =>
        item && typeof item === 'object' && 'id' in item
          ? (item as { id: unknown }).id
          : undefined
      )
      .filter((id): id is number => typeof id === 'number' && validIds.has(id))
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
  } else if (unmet.length > 0) {
    lines.push(`Steer toward the unmet goals. Don't close the lesson until they're met.`)
  }

  return lines.join('\n')
}
