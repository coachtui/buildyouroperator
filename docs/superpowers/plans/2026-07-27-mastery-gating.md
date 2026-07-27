# Phase 5 Mastery Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock the Continue button when a cheap grader confirms the student met the lesson's numbered goals, instead of after four messages of any content.

**Architecture:** Goals become a structured array that is the single source of truth for Gojo's prompt, the grader, and a student-facing checklist. On every student turn a Haiku 4.5 grader runs *in parallel* with Gojo's Sonnet stream; when Gojo's text finishes, the goal state is appended to the same HTTP response as a `\x1f`-delimited JSON tail. State is a sticky union persisted to `lesson_sessions.goal_state`. A soft unlock at 12 messages guarantees nobody is trapped, and a `graderSeen` fallback means the lesson behaves exactly as it does today if the grader or migration is unavailable.

**Tech Stack:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript 5 (strict), `@anthropic-ai/sdk` 0.90.0, Supabase JS 2, Tailwind 4, Node v24.18.0.

**Spec:** `docs/superpowers/specs/2026-07-27-mastery-gating-design.md`

## Global Constraints

- **Read the relevant guide in `node_modules/next/dist/docs/` before writing code.** Per `AGENTS.md`, this Next.js version has breaking changes vs. training data.
- **No test runner exists.** `package.json` has `dev`, `build`, `lint` only. Verification per task is: `npx tsc --noEmit`, `npm run lint`, and where stated `npm run grade-eval` / `npm run build`. Do not introduce Jest or Vitest.
- **Curriculum text is verbatim.** Goal `criterion` strings must be byte-identical to the sentences currently in `app/lib/lesson-prompts.ts`. Wording moves; it does not change.
- **Grader model is exactly `claude-haiku-4-5`.** Structured outputs use `output_config: { format: { type: 'json_schema', schema } }` on the plain `client.messages.create` — verified present in SDK 0.90.0 (`OutputConfig.format`, `JSONOutputFormat`). No beta header, no `client.beta.*`.
- **The grader must never block a lesson.** Every failure path returns `[]`.
- **Goal ids are stable and global.** When only unmet goals are sent to the grader they keep their original ids; never re-index to `1..n`.
- **Goal state is a sticky union.** A met goal is never un-met.
- **Fail-open DB reads.** Match the existing Phase 2/3 pattern in `app/api/chat/route.ts`: log with `console.error` and continue.
- **Do not gate lesson access by URL and do not add server-side enforcement to `/api/complete-lesson`.** Explicit non-goals in the spec.
- Delimiter constant is the unit separator `'\x1f'`.
- Soft unlock threshold is **12** real user messages. Legacy fallback threshold is **4**.

### Refinements to the spec made during planning

Two additions, both to remove duplication. Flag to the user if either is unwanted:

1. **`tsx` added as a devDependency** with `grade-eval` and `dump-prompts` npm scripts. The spec commits to a runnable `scripts/grade-eval.ts`, and the repo has no TS runner. Node 24 can strip types natively but requires explicit `.ts` extensions on relative imports, which would force ugly extensions into app code; `tsx` also honors the `@/*` tsconfig path alias.
2. **The stream tail carries a `soft` boolean** (`{"goals":[…],"met":[…],"soft":false}`) rather than the client re-deriving the 12-message threshold. This keeps the threshold in one place, server-side.

---

### Task 1: Structured goals as single source of truth

Extract the goal prose from each lesson body into a typed array, and generate the prompt's goals section from it so Gojo, the grader, and the checklist cannot drift.

**Files:**
- Create: `app/lib/lesson-goals.ts`
- Create: `scripts/dump-prompts.ts`
- Modify: `app/lib/lesson-prompts.ts` (remove the `## Lesson N goals — in order` block from all six `body` strings; render it in `composeLessonPrompt`)
- Modify: `package.json` (add `tsx` devDependency, `dump-prompts` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `LessonGoal { id: number; label: string; criterion: string }`, `LESSON_GOALS: Record<string, LessonGoal[]>`, `renderGoalsSection(lessonKey: string): string`. Tasks 2–4 all depend on `LESSON_GOALS`.

- [ ] **Step 1: Add the script runner and npm scripts**

```bash
npm install --save-dev tsx
```

Then add to the `scripts` block in `package.json`:

```json
    "dump-prompts": "tsx scripts/dump-prompts.ts",
```

- [ ] **Step 2: Write the prompt dumper**

Create `scripts/dump-prompts.ts`:

```ts
// Prints every composed lesson prompt. Used to prove refactors don't change
// what Gojo actually sees: dump before a change, dump after, diff the two.
import { LESSON_NUMBERS, composeLessonPrompt } from '../app/lib/lesson-prompts'

for (const lesson of LESSON_NUMBERS) {
  console.log(`===== LESSON ${lesson} =====`)
  console.log(composeLessonPrompt(lesson))
  console.log()
}
```

- [ ] **Step 3: Capture the baseline, before touching any prompt**

This is the check that makes the whole task verifiable. Run it *before* editing `lesson-prompts.ts`.

```bash
npm run dump-prompts > /tmp/prompts-before.txt
wc -l /tmp/prompts-before.txt
```

Expected: a line count in the low hundreds, and the file contains `## Lesson 1 goals — in order`. If the command errors, stop and fix the script before continuing — the baseline is required.

- [ ] **Step 4: Create `app/lib/lesson-goals.ts`**

`criterion` strings are copied verbatim from the numbered lists currently in `lesson-prompts.ts`. `label` strings are new UI copy for the checklist.

```ts
// Goals are the single source of truth for three consumers: the numbered list
// in Gojo's prompt, the grader's rubric, and the student-facing checklist.
// `criterion` is the verbatim curriculum sentence; `label` is short UI copy.

export interface LessonGoal {
  id: number
  label: string
  criterion: string
}

export const LESSON_GOALS: Record<string, LessonGoal[]> = {
  '1': [
    {
      id: 1,
      label: 'AI is a tool, not magic',
      criterion: `The student understands that AI is a tool that responds to instructions. Not magic, not a search engine, not a person.`,
    },
    {
      id: 2,
      label: 'Your input decides the output',
      criterion: `The student understands that the quality of their instructions determines the quality of the output — the AI is only as useful as what you give it.`,
    },
    {
      id: 3,
      label: 'A real insight landed',
      criterion: `The student has a concrete moment of insight they didn't have before they opened this chat.`,
    },
  ],
  '2': [
    {
      id: 1,
      label: 'What you type controls what you get',
      criterion: `The student understands that what they type to an AI (their "message" / "question" / eventually "prompt") directly controls what they get back.`,
    },
    {
      id: 2,
      label: 'Weak vs. strong instructions',
      criterion: `The student can identify what makes a weak instruction vs. a strong one — without any jargon.`,
    },
    {
      id: 3,
      label: 'Rewrote one of your own',
      criterion: `The student rewrites one of their own real, bad instructions into a good one — and sees the difference themselves.`,
    },
    {
      id: 4,
      label: 'You earned the word "prompt"',
      criterion: `The student leaves knowing the word "prompt" and what it means, because they earned it.`,
    },
  ],
  '3': [
    {
      id: 1,
      label: 'Told Gojo what you actually do',
      criterion: `The student tells you what they actually do for work and what they've tried so far.`,
    },
    {
      id: 2,
      label: 'Got one specific recommendation',
      criterion: `Based on their answer, you recommend one tool specifically — with a reason tied to their situation.`,
    },
    {
      id: 3,
      label: 'Committed to one tool',
      criterion: `They commit to it: "That's my tool." Not "I'll try all three."`,
    },
    {
      id: 4,
      label: 'Know how to access it',
      criterion: `They know how to access it and what the free vs paid difference is for their chosen tool.`,
    },
  ],
  '4': [
    {
      id: 1,
      label: 'Named your most annoying tasks',
      criterion: `You know exactly what they do for work and what their most time-consuming or annoying tasks are.`,
    },
    {
      id: 2,
      label: 'Built your first job-specific prompt',
      criterion: `Together you build the first job-specific prompt live in the conversation — they write it, you refine it.`,
    },
    {
      id: 3,
      label: 'Have 2+ prompts to use today',
      criterion: `They have at least 2 prompts they can take to their tool today.`,
    },
    {
      id: 4,
      label: 'Best prompts come from your situation',
      criterion: `They understand that the best prompts come from their specific situation, not generic templates.`,
    },
  ],
  '5': [
    {
      id: 1,
      label: 'Picked one repeated task',
      criterion: `They identify one specific task they do repeatedly that currently takes too long or requires too much thinking.`,
    },
    {
      id: 2,
      label: 'Mapped it into steps',
      criterion: `Together you map out the steps of that task in plain language.`,
    },
    {
      id: 3,
      label: 'Turned steps into a reusable prompt',
      criterion: `You help them turn those steps into a prompt (or sequence of prompts) they can reuse.`,
    },
    {
      id: 4,
      label: 'Ran it for real',
      criterion: `They run it once, right now, in their chosen tool. They come back and tell you the result.`,
    },
    {
      id: 5,
      label: 'Know you can reuse it',
      criterion: `They leave knowing this is reusable — they can do this again next time in minutes.`,
    },
  ],
  '6': [
    {
      id: 1,
      label: 'Named what changed since Lesson 1',
      criterion: `The student reflects on how they've changed since Lesson 1 — what they can do now that they couldn't before.`,
    },
    {
      id: 2,
      label: 'User vs. operator, in your words',
      criterion: `They understand the user vs. operator distinction in plain terms, using their own examples.`,
    },
    {
      id: 3,
      label: 'Named one thing you want to build',
      criterion: `They articulate one thing they want to build or do that they now know is possible.`,
    },
    {
      id: 4,
      label: 'Left feeling capable',
      criterion: `They leave feeling capable — not overwhelmed — and curious about what comes next.`,
    },
  ],
}

/** The `## Lesson N goals — in order` block, generated from LESSON_GOALS. */
export function renderGoalsSection(lessonKey: string): string {
  const goals = LESSON_GOALS[lessonKey] ?? []
  const lines = goals.map(g => `${g.id}. ${g.criterion}`).join('\n')
  return `## Lesson ${lessonKey} goals — in order\n${lines}`
}
```

- [ ] **Step 5: Strip the goals block from every lesson body**

In `app/lib/lesson-prompts.ts`, for each of the six entries in `LESSONS`, delete the leading `## Lesson N goals — in order` heading and its numbered list from the `body` template literal, so each `body` now begins with the section that followed it (`## How to open` for lessons 1 and 2, and whatever currently follows for 3–6). Leave every other line of every body untouched.

- [ ] **Step 6: Generate the goals section in `composeLessonPrompt`**

Add the import at the top of `app/lib/lesson-prompts.ts`:

```ts
import { renderGoalsSection } from './lesson-goals'
```

Then in `composeLessonPrompt`, push the generated section immediately before `mod.body` — this is the position the goals occupied when they lived inside `body`, so ordering is preserved:

```ts
  sections.push(renderGoalsSection(lesson))
  sections.push(mod.body)
```

- [ ] **Step 7: Prove Gojo's prompt is unchanged**

```bash
npm run dump-prompts > /tmp/prompts-after.txt
diff /tmp/prompts-before.txt /tmp/prompts-after.txt && echo "IDENTICAL"
```

Expected: `IDENTICAL`.

If diff reports changes, they will be whitespace around the goals block. Fix `body` trimming or the `renderGoalsSection` output until the diff is empty — **do not proceed with a non-empty diff.** A silently reworded prompt is the main risk in this task.

- [ ] **Step 8: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean, no output from `tsc`.

- [ ] **Step 9: Commit**

```bash
git add app/lib/lesson-goals.ts app/lib/lesson-prompts.ts scripts/dump-prompts.ts package.json package-lock.json
git commit -m "Extract lesson goals into structured single source of truth"
```

---

### Task 2: The grader

A pure function that reads a transcript and returns which previously-unmet goals are now met, plus fixtures that pin its behavior.

**Files:**
- Create: `app/lib/grade-lesson.ts`
- Create: `scripts/grade-eval.ts`
- Modify: `package.json` (add `grade-eval` script)

**Interfaces:**
- Consumes: `LESSON_GOALS` from `app/lib/lesson-goals.ts` (Task 1).
- Produces:
  - `gradeLesson(messages: GradeMessage[], lessonKey: string, alreadyMet: number[]): Promise<number[]>` — newly-met ids, `[]` on any failure.
  - `formatGraderState(lessonKey: string, met: number[], softUnlocked: boolean): string | undefined`
  - `GradeMessage { role: 'user' | 'assistant'; content: string }`
  - `MIN_MESSAGES_TO_GRADE: number`
  - Task 3 consumes all of these.

- [ ] **Step 1: Add the eval script npm entry**

Add to the `scripts` block in `package.json`:

```json
    "grade-eval": "tsx scripts/grade-eval.ts",
```

- [ ] **Step 2: Write the failing eval fixtures**

Create `scripts/grade-eval.ts`. This is the grader's test suite — it makes real API calls, so it is run deliberately rather than on every build.

```ts
// Grader eval. Real API calls — run deliberately, not in CI.
//   npm run grade-eval
// Each case asserts which goal ids the grader marks newly-met. Tune the
// grader prompt until all cases pass, then keep them as a regression net.
import { gradeLesson } from '../app/lib/grade-lesson'

interface Case {
  name: string
  lesson: string
  alreadyMet: number[]
  transcript: [role: 'user' | 'assistant', content: string][]
  expect: number[]
}

const CASES: Case[] = [
  {
    name: 'L1 disengaged — nothing met',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you think AI actually is, in your own words?`],
      ['user', `idk`],
      ['assistant', `No wrong answers here. What have you heard about it?`],
      ['user', `nothing really`],
      ['assistant', `Fair. Have you ever typed a question into one?`],
      ['user', `no`],
    ],
    expect: [],
  },
  {
    name: 'L1 clearly met — tool + input quality + insight',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you think AI actually is, in your own words?`],
      [
        'user',
        `I thought it was basically a smarter Google that just knows things.`,
      ],
      [
        'assistant',
        `Close, but there's a real difference. Google finds pages someone already wrote. What do you think an AI is doing instead?`,
      ],
      [
        'user',
        `Oh — so it's not looking anything up, it's actually writing a response to what I asked it. So it's more like a tool I'm giving instructions to than a place I'm searching.`,
      ],
      [
        'assistant',
        `Exactly. So what follows from that about the instructions you give it?`,
      ],
      [
        'user',
        `That's the part that just clicked for me. If it's responding to my instructions then a vague instruction gets me a vague answer. When I asked it to "write something about my job" I got garbage back and I blamed the AI, but the problem was I gave it almost nothing to work with. That's genuinely not how I was thinking about it an hour ago.`,
      ],
    ],
    expect: [1, 2, 3],
  },
  {
    name: 'L1 partial — tool understood, input quality not yet',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you think AI actually is, in your own words?`],
      [
        'user',
        `Some kind of program that answers questions. Not a person, not magic — it's software responding to what you type at it.`,
      ],
      ['assistant', `Right. And what decides how good that response is?`],
      ['user', `Probably how good the AI is? Some are better than others.`],
    ],
    expect: [1],
  },
  {
    name: 'L1 respects alreadyMet — never re-reports goal 1',
    lesson: '1',
    alreadyMet: [1],
    transcript: [
      ['assistant', `What do you think AI actually is?`],
      [
        'user',
        `Software responding to instructions, not a search engine. And I now get that what I put in decides what I get out — my vague requests were the actual problem.`,
      ],
    ],
    expect: [2],
  },
  {
    name: 'L1 teacher asserts, student never does — not met',
    lesson: '1',
    alreadyMet: [],
    transcript: [
      [
        'assistant',
        `AI is a tool that responds to instructions — not magic, not a search engine. And the quality of your instructions determines the quality of what you get back. Does that make sense?`,
      ],
      ['user', `yeah sure`],
    ],
    expect: [],
  },
  {
    name: 'L3 committed to one tool',
    lesson: '3',
    alreadyMet: [],
    transcript: [
      ['assistant', `What do you actually do for work, and what have you tried?`],
      [
        'user',
        `I'm a bookkeeper for about a dozen small businesses. I've poked at ChatGPT's free version a couple times for writing emails, nothing serious.`,
      ],
      [
        'assistant',
        `Given you're already in ChatGPT and your work is repetitive document handling, stick with ChatGPT rather than switching — the paid tier adds file uploads, which matters for you because you can hand it a statement directly.`,
      ],
      [
        'user',
        `That's my tool then. ChatGPT. I'll stay on free for now and upgrade when I need the file uploads — I can just log in with the account I already have.`,
      ],
    ],
    expect: [1, 2, 3, 4],
  },
]

let failed = 0

for (const c of CASES) {
  const messages = c.transcript.map(([role, content]) => ({ role, content }))
  const got = await gradeLesson(messages, c.lesson, c.alreadyMet)
  const sorted = [...got].sort((a, b) => a - b)
  const want = [...c.expect].sort((a, b) => a - b)
  const ok = JSON.stringify(sorted) === JSON.stringify(want)
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${c.name}\n      want [${want}]  got [${sorted}]`
  )
}

console.log(`\n${CASES.length - failed}/${CASES.length} passed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 3: Run the eval to verify it fails**

```bash
npm run grade-eval
```

Expected: failure resolving `../app/lib/grade-lesson` — the module does not exist yet.

- [ ] **Step 4: Implement the grader**

Create `app/lib/grade-lesson.ts`. It keeps its own local `SYSTEM_MESSAGES` filter, matching the existing convention in `app/lib/analyze-session.ts` rather than introducing a shared helper.

```ts
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

/** Below this there is nothing to grade — the student has barely spoken. */
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

  const realUserCount = messages.filter(
    m => m.role === 'user' && !isSystemMessage(m.content)
  ).length
  if (realUserCount < MIN_MESSAGES_TO_GRADE) return []

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
```

- [ ] **Step 5: Run the eval until it passes**

```bash
npm run grade-eval
```

Expected: `6/6 passed`.

If cases fail, tune the grader prompt's Rules block — **not** the fixtures. The two cases most likely to need work are `teacher asserts, student never does` (grader too generous) and `clearly met` (grader too strict). If a fixture is genuinely wrong about what the curriculum asks for, fix the fixture and note why in the commit message.

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add app/lib/grade-lesson.ts scripts/grade-eval.ts package.json
git commit -m "Add Haiku goal grader with eval fixtures"
```

---

### Task 3: Persist goal state and wire the grader into the chat route

Add the column, read state into Gojo's prompt, run the grader in parallel with the stream, append the tail, and save the union.

**Files:**
- Create: `supabase-migrations/2026-07-27-phase5-goal-state.sql`
- Modify: `supabase-schema.sql` (add `goal_state` to the `lesson_sessions` definition)
- Modify: `app/api/chat/route.ts`

**Interfaces:**
- Consumes: `gradeLesson`, `formatGraderState`, `MIN_MESSAGES_TO_GRADE`, `GradeMessage` (Task 2); `LESSON_GOALS` (Task 1).
- Produces: the wire format Task 4 parses —
  `'\x1f' + JSON.stringify({ goals: {id,label}[], met: number[], soft: boolean })`
  appended once after Gojo's text. Task 4 must not assume the tail is always present.

- [ ] **Step 1: Write the migration**

Create `supabase-migrations/2026-07-27-phase5-goal-state.sql`:

```sql
-- Phase 5: mastery gating — per-session goal completion state.
-- Run in the Supabase SQL editor.
-- Shape: { "met": [1, 2] }  (sticky union of met goal ids)

alter table lesson_sessions add column if not exists goal_state jsonb;
```

- [ ] **Step 2: Mirror the column in the tracked schema**

In `supabase-schema.sql`, add `goal_state` to the `lesson_sessions` table so a fresh environment gets it. Insert after the `messages` line:

```sql
  goal_state jsonb,
```

- [ ] **Step 3: Import the grader and add constants**

In `app/api/chat/route.ts`, add to the imports:

```ts
import {
  gradeLesson,
  formatGraderState,
  MIN_MESSAGES_TO_GRADE,
} from '@/app/lib/grade-lesson'
import { LESSON_GOALS } from '@/app/lib/lesson-goals'
```

And alongside the other module constants:

```ts
// Student is released after this many messages even with goals unmet, so a
// grader that never converges can't trap anyone. Well under
// MESSAGE_LIMIT_PER_LESSON so the 30-message copy stays accurate.
const SOFT_UNLOCK_MESSAGES = 12
// Unit separator: not typeable, cannot occur in Gojo's prose.
const GOAL_TAIL_DELIMITER = '\x1f'
// Beyond this the checklist just updates next turn; state still persists.
const GRADER_TAIL_TIMEOUT_MS = 3000

interface GoalStateRow {
  met?: number[]
}
```

- [ ] **Step 4: Read the existing goal state**

Change the `lesson_sessions` select inside the existing `Promise.all` from `select('id, messages')` to:

```ts
      .select('id, messages, goal_state')
```

Then after `const realCount = countRealUserMessages(storedMessages)`, add:

```ts
  // Fails open: before the phase5 migration, goal_state is undefined and the
  // client falls back to the legacy message-count unlock.
  const goalStateRow = (existingSession?.goal_state ?? null) as GoalStateRow | null
  const met = Array.isArray(goalStateRow?.met) ? goalStateRow.met : []
  const goals = LESSON_GOALS[lessonKey] ?? []
```

- [ ] **Step 5: Inject unmet goals into Gojo's prompt**

The `graderState` slot already exists in `PromptContext` and is already consumed at `app/lib/lesson-prompts.ts:249`. Populate it — add this next to the existing `promptCtx.priorAnalysis` assignment, **before** `composeLessonPrompt` is called:

```ts
  const graderState = formatGraderState(
    lessonKey,
    met,
    realCount >= SOFT_UNLOCK_MESSAGES
  )
  if (graderState) promptCtx.graderState = graderState
```

- [ ] **Step 6: Start the grader in parallel with the stream**

Immediately before the `return streamLesson(...)` call, add:

```ts
  // Graded through the student's latest message — Gojo's pending reply adds no
  // evidence of student understanding, so this can run alongside the stream
  // instead of after it. Never rejects; gradeLesson returns [] on failure.
  const shouldGrade =
    action === 'message' && goals.length > 0 && met.length < goals.length
  const gradePromise: Promise<number[]> = shouldGrade
    ? gradeLesson(chatHistory, lessonKey, met)
    : Promise.resolve([])

  // Emitted even when grading was skipped, so the checklist always renders.
  const goalTail = async (): Promise<string | null> => {
    if (goals.length === 0) return null

    let timer: ReturnType<typeof setTimeout> | undefined
    const newlyMet = await Promise.race([
      gradePromise,
      new Promise<number[]>(resolve => {
        timer = setTimeout(() => resolve([]), GRADER_TAIL_TIMEOUT_MS)
      }),
    ])
    if (timer) clearTimeout(timer)

    const union = [...new Set([...met, ...newlyMet])].sort((a, b) => a - b)
    const payload = {
      goals: goals.map(g => ({ id: g.id, label: g.label })),
      met: union,
      soft: realCount >= SOFT_UNLOCK_MESSAGES,
    }
    return `${GOAL_TAIL_DELIMITER}${JSON.stringify(payload)}`
  }
```

- [ ] **Step 7: Persist the union in the existing `after()` callback**

Inside the `streamLesson` `onComplete` callback, after the `increment_chat_usage` RPC block and before the `fullMessages` assignment, add:

```ts
    // Full await, no timeout: unlike the tail this runs in after(), so a slow
    // grade is still saved even if the checklist missed it this turn.
    const newlyMet = await gradePromise.catch(() => [] as number[])
    const unionMet = [...new Set([...met, ...newlyMet])].sort((a, b) => a - b)
```

Then extend the two existing session writes to include the column. The update branch becomes:

```ts
        .update({ messages: fullMessages, goal_state: { met: unionMet } })
```

The insert branch becomes:

```ts
        .insert({
          user_id: user.id,
          lesson_number: lessonNumber,
          messages: fullMessages,
          goal_state: { met: unionMet },
        })
```

and the insert-failure fallback update becomes:

```ts
          .update({ messages: fullMessages, goal_state: { met: unionMet } })
```

- [ ] **Step 8: Pass the tail into `streamLesson`**

Change the final return to:

```ts
  return streamLesson(systemPrompt, chatHistory, async (assistantText, usage) => {
```

…leaving the callback body as edited in Step 7, and add `goalTail` as the fourth argument at the call's closing:

```ts
  }, goalTail)
```

- [ ] **Step 9: Emit the tail from `streamLesson`**

Extend the signature:

```ts
function streamLesson(
  systemPrompt: string,
  history: ChatMessage[],
  onComplete?: (assistantText: string, usage: TokenUsage) => Promise<void>,
  tail?: () => Promise<string | null>
) {
```

Then replace the `finally` block inside the `ReadableStream`'s `start` with:

```ts
      } finally {
        // Enqueued after Gojo's text and never pushed to `chunks`, so the tail
        // is not persisted as part of the assistant message.
        if (tail) {
          try {
            const suffix = await tail()
            if (suffix) controller.enqueue(encoder.encode(suffix))
          } catch (err) {
            console.error('goal tail failed:', err instanceof Error ? err.message : err)
          }
        }
        controller.close()
        resolveDone({ text: chunks.join(''), usage })
      }
```

- [ ] **Step 10: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean.

- [ ] **Step 11: Apply the migration**

Run the contents of `supabase-migrations/2026-07-27-phase5-goal-state.sql` in the Supabase SQL editor.

Verify:

```sql
select column_name, data_type from information_schema.columns
where table_name = 'lesson_sessions' and column_name = 'goal_state';
```

Expected: one row, `goal_state | jsonb`.

- [ ] **Step 12: Verify the tail end-to-end against the dev server**

```bash
npm run dev
```

In a second terminal, mint a demo-free real token path by using an existing user's token from your `.env.local` test flow, then:

```bash
curl -sN localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"action":"message","lesson":"1","token":"<REAL_TOKEN>","message":"So it is a tool I give instructions to, not a search engine. And if my instructions are vague I get vague output back — that is what I was getting wrong."}' \
  | tail -c 400 | cat -v
```

Expected: Gojo's prose, then `^_` (how `cat -v` renders `\x1f`), then a JSON object containing `"goals"`, `"met"`, and `"soft":false`.

Then confirm it persisted:

```sql
select lesson_number, goal_state from lesson_sessions
where lesson_number = 1 order by created_at desc limit 1;
```

Expected: `goal_state` is `{"met": [...]}` with at least one id.

- [ ] **Step 13: Commit**

```bash
git add supabase-migrations/2026-07-27-phase5-goal-state.sql supabase-schema.sql app/api/chat/route.ts
git commit -m "Grade lesson goals in parallel with Gojo's stream"
```

---

### Task 4: Checklist UI and grader-driven unlock

Render the goal checklist, and replace the message-count gate with the grader's verdict — keeping today's behavior as the fallback.

**Files:**
- Modify: `app/components/LessonPage.tsx`

**Interfaces:**
- Consumes: the `\x1f`-delimited tail from Task 3.
- Produces: no exports. Terminal task for the feature.

- [ ] **Step 1: Add the tail parser and goal state**

In `app/components/LessonPage.tsx`, add alongside the existing module constants:

```ts
// Must match GOAL_TAIL_DELIMITER in app/api/chat/route.ts.
const GOAL_TAIL_DELIMITER = '\x1f'
// Used only when no grader tail ever arrives (pre-migration / grader down).
const LEGACY_UNLOCK_MESSAGES = 4

interface GoalState {
  goals: { id: number; label: string }[]
  met: number[]
  soft: boolean
}
```

Then inside the component, next to the other `useState` calls:

```ts
  const [goalState, setGoalState] = useState<GoalState | null>(null)
```

- [ ] **Step 2: Split the tail out of the stream**

In `streamResponse`, the accumulated `text` may end with the delimiter plus JSON. Replace the body of the read loop's state update so the tail is stripped before rendering and parsed once complete:

```ts
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })

      const cut = text.indexOf(GOAL_TAIL_DELIMITER)
      const visible = cut === -1 ? text : text.slice(0, cut)

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: visible }
        return updated
      })
    }

    // A stream that died mid-tail leaves unparseable JSON; keep prior state.
    const cut = text.indexOf(GOAL_TAIL_DELIMITER)
    if (cut !== -1) {
      try {
        const parsed = JSON.parse(text.slice(cut + 1)) as GoalState
        if (Array.isArray(parsed.goals) && Array.isArray(parsed.met)) {
          setGoalState(parsed)
        }
      } catch {
        // Checklist keeps its previous value and updates next turn.
      }
    }
```

- [ ] **Step 3: Replace the unlock rule**

Replace the existing line 162 (`const showContinue = started && !loading && realUserMessageCount >= 4`) with:

```ts
  const unmetCount = goalState
    ? goalState.goals.length - goalState.met.length
    : null

  // No tail ever arrived (migration not applied, or grader erroring) — behave
  // exactly as the pre-Phase-5 app did rather than trapping anyone.
  const showContinue =
    started &&
    !loading &&
    (goalState
      ? unmetCount === 0 || goalState.soft
      : realUserMessageCount >= LEGACY_UNLOCK_MESSAGES)

  const releasedEarly = !!goalState && goalState.soft && (unmetCount ?? 0) > 0
```

- [ ] **Step 4: Render the checklist**

Add above the chat transcript, rendered only once `goalState` exists so the pre-migration UI is untouched:

```tsx
      {goalState && (
        <div
          className="mb-4 rounded-lg border px-4 py-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <p
            className="text-xs tracking-widest uppercase mb-2"
            style={{ color: 'var(--muted)' }}
          >
            Lesson {lesson.number}
          </p>
          <ul className="flex flex-col gap-1.5">
            {goalState.goals.map(g => {
              const done = goalState.met.includes(g.id)
              return (
                <li key={g.id} className="flex items-start gap-2 text-sm">
                  <span
                    aria-hidden
                    style={{ color: done ? 'var(--accent)' : 'var(--muted)' }}
                  >
                    {done ? '✓' : '○'}
                  </span>
                  <span style={{ color: done ? 'var(--foreground)' : 'var(--muted)' }}>
                    {g.label}
                  </span>
                  <span className="sr-only">{done ? '(done)' : '(not yet)'}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
```

- [ ] **Step 5: Add the soft-unlock copy**

Next to the existing `{showContinue && (` block, prepend the released-early line so the student understands why the button appeared with circles still open:

```tsx
      {releasedEarly && (
        <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
          You&apos;ve put in the work. Move on when you&apos;re ready.
        </p>
      )}
```

- [ ] **Step 6: Typecheck, lint, and build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: all three clean.

- [ ] **Step 7: Verify in the browser**

```bash
npm run dev
```

Open `/recruit/1?token=<REAL_TOKEN>` and confirm:
- The checklist renders with all goals as `○` once the lesson starts.
- Goals tick to `✓` as you demonstrate them; no `✓` ever reverts to `○`.
- Continue is absent while goals are unmet, and appears when all are met.
- No `\x1f` character or JSON is ever visible in Gojo's message text.
- The browser console has no errors.

Then verify the soft unlock without waiting 12 turns: temporarily set `SOFT_UNLOCK_MESSAGES = 2` in `app/api/chat/route.ts`, reload, send two messages, confirm Continue appears with the "You've put in the work" line and open circles — **then restore it to 12.**

Finally verify the fallback: in the Supabase SQL editor run `alter table lesson_sessions drop column goal_state;`, reload a lesson, confirm no checklist renders and Continue appears after 4 messages as before, then re-apply the migration from Task 3.

- [ ] **Step 8: Commit**

```bash
git add app/components/LessonPage.tsx
git commit -m "Gate Continue on grader-verified goals with visible checklist"
```

---

### Task 5: Update the roadmap and close the phase

**Files:**
- Modify: `ROADMAP.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Mark Phase 5 done with verified exit criteria**

In `ROADMAP.md`, check off the three Phase 5 items and replace the `**Exit:**` line with a verified block in the style used by Phases 3 and 4. Amend the mastery claim to be honest about URL access:

```markdown
## Phase 5 — Mastery gating

- [x] Cheap grader checks transcript against the lesson's numbered goals.
      Haiku 4.5 with structured outputs, run in parallel with Gojo's stream
      (`app/lib/grade-lesson.ts`); goals are structured in
      `app/lib/lesson-goals.ts` and generate the prompt's goals section.
- [x] Continue unlocks on goals-met, not message count ≥ 4.
      Sticky state in `lesson_sessions.goal_state`, delivered to the client as a
      `\x1f`-delimited tail on the chat stream. Soft unlock at 12 messages so a
      non-converging grader can't trap anyone; legacy `≥ 4` retained as the
      no-grader fallback.
- [x] Unmet goals fed into Gojo's context so it steers toward what's missing.
      Populates the `graderState` slot in `composeLessonPrompt`.

**Exit verified 2026-07-27:** "won't move on until you get it" is mechanically
true **for a student following the course** — direct URL access to any lesson
remains open by design (Phase 4 free flip), so the gate is a teaching device,
not a lock. Grader eval fixtures pass (`npm run grade-eval`); checklist ticks
within one turn; soft unlock verified at a lowered threshold; fallback verified
with the migration reverted.
```

- [ ] **Step 2: Check site copy for the stronger claim**

```bash
grep -rniE "won't move on|until you get it|master(y|ed)" app/ --include=*.tsx
```

Expected: no results. If any marketing copy makes the unqualified "won't move on" claim, report it to the user rather than editing it — that is a copy decision, not an implementation detail.

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "Mark Phase 5 mastery gating done"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| `lesson-goals.ts` structured goals | 1 |
| `composeLessonPrompt` generates goals section | 1 |
| `graderState` populated | 3 (Step 5) |
| `grade-lesson.ts` Haiku + structured outputs | 2 |
| Only-unmet prompt, stable ids, `[]` on error, skip conditions | 2 |
| `chat/route.ts` read / parallel / persist | 3 |
| `\x1f` tail with labels on the wire | 3 (Steps 6, 9) |
| 3s tail timeout, full await for persistence | 3 (Steps 6, 7) |
| Migration, no backfill, fail-open reads | 3 (Steps 1, 4, 11) |
| `complete-lesson` unchanged | not a task, by design |
| Checklist UI | 4 |
| Unlock rule + soft unlock + `graderSeen` fallback | 4 (Step 3) |
| Error handling table | 2 (`catch`), 3 (Step 9), 4 (Step 2) |
| `scripts/grade-eval.ts` fixtures | 2 |
| Manual E2E, tsc, lint, build | 4 (Steps 6, 7) |
| ROADMAP exit-line amendment | 5 |

No gaps. Two additions beyond the spec, both declared in Global Constraints: the `tsx` devDependency (with `dump-prompts`) and the `soft` field on the tail.

**Placeholder scan:** No TBD/TODO. Every code step has real code. The only judgment call left to the implementer is grader-prompt tuning in Task 2 Step 5, which is inherent to the work and bounded by concrete pass/fail fixtures.

**Type consistency:** `GoalState { goals, met, soft }` in Task 4 matches the payload built in Task 3 Step 6 exactly. `gradeLesson(messages, lessonKey, alreadyMet)` and `formatGraderState(lessonKey, met, softUnlocked)` are declared in Task 2 and called with matching arity in Task 3. `GOAL_TAIL_DELIMITER` is defined in both the route and the component with a comment pinning them together. `LESSON_GOALS` keys are strings (`'1'`–`'6'`) throughout, matching the existing `LESSONS` record and `lessonKey`; `lessonNumber` stays a number and is used only for DB columns.

One known duplication, deliberate: `SYSTEM_MESSAGES` and the real-user-message filter now exist in `chat/route.ts`, `analyze-session.ts`, `grade-lesson.ts`, and `LessonPage.tsx`. That matches the pattern already in the codebase; consolidating it is a separate refactor and out of scope here.
