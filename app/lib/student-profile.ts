import Anthropic from '@anthropic-ai/sdk'

// Cross-lesson memory: a compact profile of the student, updated after each
// completed lesson by a cheap extraction pass and injected into every
// subsequent lesson's system prompt (see composeLessonPrompt).

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface StudentProfile {
  job: string | null
  chosen_tool: string | null
  skill_level: string | null
  goals: string | null
  prompts_built: string[]
  misconceptions: string[]
  wins: string[]
  notes: string | null
  lessons_completed: number[]
}

const SYSTEM_MESSAGES = ['Begin the lesson.', 'The student is returning.']

export async function extractStudentProfile(
  messages: Message[],
  lessonNumber: number,
  existingProfile: StudentProfile | null
): Promise<StudentProfile | null> {
  const client = new Anthropic()

  const transcript = messages
    .filter(m => !(m.role === 'user' && SYSTEM_MESSAGES.some(s => m.content.startsWith(s))))
    .map(m => `${m.role === 'user' ? 'STUDENT' : 'GOJO'}: ${m.content}`)
    .join('\n\n')

  if (!transcript) return existingProfile

  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You maintain a student profile for an AI education course. Below is the profile so far and the transcript of the lesson the student just completed (Lesson ${lessonNumber}). Return the UPDATED profile as JSON with exactly these fields:

- job: what the student does for work, as specifically as stated (or null)
- chosen_tool: the AI tool they committed to — ChatGPT, Claude, or Gemini (or null)
- skill_level: one short phrase, e.g. "complete beginner", "uses AI weekly, shallow prompts" (or null)
- goals: what they said they want from AI, in one sentence (or null)
- prompts_built: array of short descriptions of real prompts/workflows they built in lessons (carry forward earlier ones)
- misconceptions: array of misconceptions they showed that may still linger (drop ones the transcript shows are resolved)
- wins: array of moments where something clicked for them (keep the 3 most meaningful)
- notes: anything else a teacher should remember — tone they respond to, personal context they volunteered (or null)
- lessons_completed: the existing array plus ${lessonNumber}

Merge, don't replace: keep prior facts unless the new transcript updates or contradicts them. Be concrete and brief — this gets injected into a system prompt. Return ONLY valid JSON, no markdown.

EXISTING PROFILE:
${existingProfile ? JSON.stringify(existingProfile, null, 2) : 'null (first lesson completed)'}

LESSON ${lessonNumber} TRANSCRIPT:
${transcript}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  // Models sometimes fence or preface the JSON — parse the outermost object.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as StudentProfile
    if (!Array.isArray(parsed.lessons_completed)) {
      parsed.lessons_completed = [...(existingProfile?.lessons_completed ?? []), lessonNumber]
    }
    return parsed
  } catch {
    console.error('student profile parse failed for lesson', lessonNumber)
    return existingProfile
  }
}

/** Renders the profile as plain-English lines for the system prompt. */
export function formatStudentProfile(profile: StudentProfile): string {
  const lines: string[] = []
  if (profile.job) lines.push(`- Their work: ${profile.job}`)
  if (profile.chosen_tool) lines.push(`- Their AI tool (they committed to it in Lesson 3): ${profile.chosen_tool}`)
  if (profile.skill_level) lines.push(`- Skill level: ${profile.skill_level}`)
  if (profile.goals) lines.push(`- What they want: ${profile.goals}`)
  if (profile.prompts_built?.length) lines.push(`- Prompts/workflows they've built: ${profile.prompts_built.join('; ')}`)
  if (profile.misconceptions?.length) lines.push(`- Possible lingering misconceptions: ${profile.misconceptions.join('; ')}`)
  if (profile.wins?.length) lines.push(`- Moments that clicked for them: ${profile.wins.join('; ')}`)
  if (profile.notes) lines.push(`- Worth remembering: ${profile.notes}`)
  if (profile.lessons_completed?.length) lines.push(`- Lessons completed: ${profile.lessons_completed.join(', ')}`)
  return lines.join('\n')
}

export interface LessonAnalysisRow {
  lesson_number: number
  sentiment: string | null
  struggled_with: string | null
  what_clicked: string | null
  summary: string | null
}

/** Renders the previous lesson's analysis as plain-English lines for the system prompt. */
export function formatPriorAnalysis(analysis: LessonAnalysisRow): string {
  const lines: string[] = [`In Lesson ${analysis.lesson_number}:`]
  if (analysis.summary) lines.push(`- ${analysis.summary}`)
  if (analysis.struggled_with) lines.push(`- They struggled with: ${analysis.struggled_with}`)
  if (analysis.what_clicked) lines.push(`- What clicked: ${analysis.what_clicked}`)
  if (analysis.sentiment) lines.push(`- How they left: ${analysis.sentiment}`)
  return lines.join('\n')
}
