# Phase 5 — Mastery Gating

**Date:** 2026-07-27
**Status:** Approved, ready for implementation planning
**ROADMAP phase:** 5

## Problem

`ROADMAP.md` claims Gojo "won't move on until you get it." Today that is prompt
language only. The Continue button is gated on a raw message count:

```ts
// app/components/LessonPage.tsx:162
const showContinue = started && !loading && realUserMessageCount >= 4
```

Four user messages of any content unlock the next lesson — "idk" four times
works. Each lesson body already carries 3–5 numbered goals and a
`## How to close — when all goals are met` section, and `PromptContext` already
types a `graderState` slot (`app/lib/lesson-prompts.ts:21`) that injects
*"Steer toward the unmet goals. Don't close the lesson until they're met."*
Nothing ever populates it. The `lesson_analyses` grading that does run fires
**after** completion, so it informs the next lesson's memory but never gates the
current one.

## Goals

1. A cheap grader checks the transcript against the lesson's numbered goals.
2. Continue unlocks on goals-met, not message count.
3. Unmet goals are fed into Gojo's context so it steers toward what's missing.
4. The student can see which goals are met.
5. Nobody is ever trapped in a lesson.

## Non-goals

- **URL-level lesson locking.** Since the Phase 4 free flip, any valid token
  opens any lesson. That stays true. The gate is a teaching device, not a lock:
  a student following the course gets held until they've got it; a student who
  types `/recruit/6?token=…` still gets in. Re-gating access would re-introduce
  the tier logic Phase 4 deliberately deleted and turn any grader
  false-negative into a lockout from a free course.
- **Server-side enforcement of `/api/complete-lesson`.** Pointless while URLs
  are open, and it would be the only thing standing between a student and a
  course they were promised full access to.
- **Rewriting the curriculum.** Goal *wording* moves; goal *content* does not.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Locked-state UX | Visible goal checklist | Makes mastery tangible and explains why the button isn't there yet |
| Grader timing | Every turn, in parallel with Gojo's stream | Zero added latency; checklist ticks as the message lands |
| Never-converges case | Soft unlock at 12 real user messages | Nobody trapped; median student (5–8 messages) never sees it |
| Goal state | Sticky — once met, always met | A checkmark that un-ticks reads as a bug |
| Enforcement | Continue button only | Keeps Phase 4's open-access ethos; no lockout risk |

## Architecture

```
student message
      │
      ├──────────▶ gradeLesson()      Haiku 4.5, ~1s   ─┐
      │            (unmet goals only)                    │
      └──────────▶ streamLesson()     Sonnet 4.6, ~4s    │
                        │                                │
                   [Gojo's text streams to client]       │
                        │                                │
                        ▼         ◀───────────────────────┘
                   \x1f{"goals":[…],"met":[1,2]}   ← appended tail
                        │
                   client splits on \x1f → ticks checklist
                        │
                   after(): persist union(met, newlyMet) to goal_state
```

The grader reads the transcript **through the student's latest message**,
excluding Gojo's still-streaming reply. This is what makes the parallel fan-out
sound: goals are met by the *student's* demonstrated understanding, and Gojo's
reply adds no evidence of it. Consequence: the `graderState` injected into the
next turn's prompt is one Gojo-turn stale, which does not matter.

## Components

### `app/lib/lesson-goals.ts` (new, server-only)

Single source of truth for goals.

```ts
export interface LessonGoal {
  id: number        // 1-based, matches the numbered curriculum list
  label: string     // short, student-facing — rendered in the checklist
  criterion: string // grader-facing — what evidence counts as met
}

export const LESSON_GOALS: Record<string, LessonGoal[]>
```

`criterion` values are the existing goal sentences from each lesson's `body`,
**verbatim**. `label` values are new short forms for the checklist:

| Lesson | Labels |
|---|---|
| 1 | AI is a tool, not magic · Your input decides the output · A real insight landed |
| 2 | What you type controls what you get · Weak vs. strong instructions · Rewrote one of your own · You earned the word "prompt" |
| 3 | Told Gojo what you actually do · Got one specific recommendation · Committed to one tool · Know how to access it |
| 4 | Named your most annoying tasks · Built your first job-specific prompt · Have 2+ prompts to use today · Best prompts come from your situation |
| 5 | Picked one repeated task · Mapped it into steps · Turned steps into a reusable prompt · Ran it for real · Know you can reuse it |
| 6 | Named what changed since Lesson 1 · User vs. operator, in your words · Named one thing you want to build · Left feeling capable |

Labels are tunable during implementation; they are UI copy, not curriculum.

### `app/lib/lesson-prompts.ts` (modified)

`composeLessonPrompt` renders the `## Lesson N goals — in order` section from
`LESSON_GOALS[lesson]` instead of the hardcoded prose currently inside each
`body`. The `criterion` text is byte-identical to what is there now — it moves,
it does not change. Everything else in each `body` (`## How to open`,
`## How to close`, per-lesson handling notes) stays verbatim.

This removes a whole class of bug: Gojo, the grader, and the checklist read the
same array, so they cannot drift.

`graderState` (already typed at line 21, already injected at line 249) gets
populated for the first time. Format:

```
Met: 1, 2
Not yet met:
3. The student has a concrete moment of insight they didn't have before this chat.
```

When the student is soft-unlocked with goals still open, the injected block also
tells Gojo the student is being released and to close warmly rather than keep
pushing.

### `app/lib/grade-lesson.ts` (new)

Modelled on the existing `app/lib/analyze-session.ts`.

```ts
export async function gradeLesson(
  messages: Message[],
  lessonKey: string,
  alreadyMet: number[],
): Promise<number[]>   // newly-met goal ids
```

- **Model:** `claude-haiku-4-5` ($1/$5 per MTok).
- **Structured output:** `output_config: { format: { type: 'json_schema', schema } }`
  with `{ newly_met: integer[] }`, `additionalProperties: false`. Haiku 4.5
  supports structured outputs, so malformed JSON is impossible — no
  markdown-fence stripping like `student-profile.ts` needs.
- **Only unmet goals are sent.** The prompt shrinks as the lesson progresses.
  Goals keep their **original `id`** in the prompt — they are never re-indexed
  to 1..n for the shrunken set, so returned ids always map back correctly.
- **Returns `[]` on any error.** The grader can never block a lesson.
- Transcript built with the same `SYSTEM_MESSAGES` filter `analyze-session.ts`
  uses, so `Begin the lesson.` / `The student is returning.` are excluded.

Skipped entirely when: `action === 'start'`, demo mode (stateless, no DB user),
fewer than 2 real user messages, or all goals already met. The all-met skip
means grader cost tapers to zero over a lesson.

**Cost:** ~4K input + ~200 output per grade ≈ $0.005. At ~12 grades/lesson,
~$0.06/lesson and ~$0.36 for all six — a small fraction of the Sonnet 4.6
teaching turns already being spent.

### `app/api/chat/route.ts` (modified)

1. Add `goal_state` to the existing `lesson_sessions` select (currently
   `select('id, messages')`).
2. Build `promptCtx.graderState` from met/unmet goals.
3. Start `gradeLesson(chatHistory, …)` **before** `streamLesson` so both are in
   flight together. `chatHistory` at that point already includes the appended
   user turn.
4. Pass the grader promise into `streamLesson`.
5. In the existing `after()` `onComplete`, persist `union(met, newlyMet)` to
   `goal_state` alongside the existing `messages` write.

`goal_state` reads fail open with a `console.error`, matching the Phase 2
(`chat_usage`) and Phase 3 (`student_profile`) precedent already in this file.

### The stream tail

After Gojo's text completes, `streamLesson` enqueues `\x1f` followed by one line
of JSON:

```
…that's the shift right there.\x1f{"goals":[{"id":1,"label":"AI is a tool, not magic"},…],"met":[1,2]}
```

`\x1f` (unit separator) is not typeable and does not occur in prose, so it
cannot collide with Gojo's output.

`goals` carries the **full** goal list with labels (not just the unmet ones) so
the client can render the complete checklist from a single tail; `met` is the
sticky union of ids.

**Labels ride the wire** rather than living in a client-side constant. This
keeps the curriculum out of the JS bundle and means the labels exist in exactly
one place.

Bounded by `Promise.race([graderPromise, timeout(3000)])`. If the grader is
slow, no tail is emitted and the checklist catches up on the next turn. The
grader (~1s) is normally well ahead of Gojo (~4s), so this should be rare.

### `app/components/LessonPage.tsx` (modified)

- Split incoming stream text on `\x1f`; render only the part before it.
- `try/catch` the JSON parse — a stream that dies mid-tail keeps the previous
  state rather than throwing.
- New `goalState` state: `{ goals: {id,label}[], met: number[] }` and a
  `graderSeen` flag set on the first successful parse.
- Checklist rendered above the chat: `✓` for met, `○` for unmet.
- Replace line 162:

```ts
const allMet = graderSeen && goalState.met.length === goalState.goals.length
const softUnlock = realUserMessageCount >= SOFT_UNLOCK_MESSAGES  // 12

const showContinue = started && !loading && (
  graderSeen
    ? allMet || softUnlock
    : realUserMessageCount >= LEGACY_UNLOCK_MESSAGES  // 4 — no-grader fallback
)
```

- Soft-unlock copy variant beneath the checklist: *"You've put in the work. Move
  on when you're ready."* Remaining goals stay as open circles, never marked
  failed.

The `graderSeen` fallback is the rollout safety net: if the migration has not
run or the grader is erroring, no tail ever arrives and the lesson behaves
exactly as it does today. This branch stays in the code permanently.

### `app/api/complete-lesson/route.ts`

Unchanged. Per the non-goals above, server-side gate enforcement is out of
scope.

### Migration

`supabase-migrations/2026-07-27-phase5-goal-state.sql`:

```sql
alter table lesson_sessions add column if not exists goal_state jsonb;
```

No backfill. Grading is lazy: a student mid-lesson when this ships gets their
full transcript graded on their next message, which either marks goals met
immediately or leaves them to the soft unlock. Either path works, so there is no
migration wall.

## Error handling

| Failure | Behavior |
|---|---|
| Grader API error / timeout | Returns `[]`; no tail; state unchanged; lesson continues |
| `goal_state` column missing | Read logs and fails open; `graderSeen` stays false; `>= 4` fallback applies |
| Stream dies mid-tail | Parse throws, caught; previous checklist state retained |
| Grader marks a met goal unmet | Ignored — state is a sticky union |
| Grader never converges | Soft unlock at 12 messages; 30-message cap remains the hard backstop |
| `goal_state` write fails | Logged; next turn re-grades from the transcript and recovers |

The 30-message limit copy in `chat/route.ts` (*"Use the Continue button to move
to the next lesson"*) is correct under this design, because 12 < 30 guarantees
the button is present by then.

## Testing

The repo has no test runner (`package.json` has `dev`, `build`, `lint` only).
Rather than introduce one for this phase:

- **`scripts/grade-eval.ts`** — fixture transcripts per lesson across four
  shapes (clearly-met, clearly-unmet, ambiguous, disengaged), run through
  `gradeLesson`, asserting expected goal ids. This is where grader tuning
  actually happens and it is the artifact worth keeping.
- **Manual E2E** through all six lessons: confirm the checklist ticks, Continue
  appears on all-met, soft unlock fires at 12, and the `graderSeen` fallback
  works with the migration reverted.
- `npx tsc --noEmit` and `npm run lint` clean, plus a production build.

## Exit criteria

- [ ] Continue unlocks on goals-met, not message count
- [ ] Unmet goals reach Gojo via `graderState` and visibly steer the conversation
- [ ] Checklist reflects grader state within one turn
- [ ] Soft unlock at 12 messages verified; no path traps a student
- [ ] Fallback verified with migration reverted
- [ ] Grader eval fixtures pass for all six lessons

ROADMAP's exit line — *"'won't move on until you get it' is mechanically true"* —
should be amended to note it is mechanically true **for a student following the
course**, since direct URL access remains open by design.
