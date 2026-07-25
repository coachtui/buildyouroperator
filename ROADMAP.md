# Operator — Upgrade Roadmap

Product direction (decided 2026-07-25): **free to use, email-gated, income later.**
The paid tiers are parked, not deleted. The asset being built is (1) an email list of
AI-skeptic learners and (2) proof that conversational learning outperforms video.

Guiding test for any new feature: *does this make the system know the student better
than it did yesterday?*

## Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Server owns the conversation | **Done** (migration pending — see below) |
| 2 | Spend controls | **Done** (migration + console alert pending — see below) |
| 3 | Student model (memory) | **Done** (migration pending — see below) |
| 4 | Free flip + launch surface | Not started |
| 5 | Mastery gating | Not started |
| 6 | The loops (digest, smart re-engage, notebook) | Not started |

---

## Phase 1 — Server owns the conversation

The chat endpoint stops trusting the client. Foundation for all intelligence work.

- [x] `/api/chat` accepts only `{ action, message?, lesson, token }` — server rebuilds
      history from `lesson_sessions`, appends, streams, persists. Client never sends
      the message array. (Landing-page demo is the one exception: stateless shared
      token marked `demo: true`, client history accepted but hard-bounded — 8 user
      turns, 20k chars total, Lesson 1 only.)
- [x] Synthetic messages ("Begin the lesson." / resume) constructed server-side from
      `action: 'start' | 'resume' | 'message'`.
- [x] Input cap 2,000 chars per student message.
- [x] Waitlist signup creates the `users` row immediately — DB failure now fails the
      signup instead of being logged and ignored.
- [x] Persist assistant turns durably via `after()`; persistence errors are logged,
      insert falls back to update so it works with or without the unique constraint.
- [x] Unique constraint in schema + migration file.
      **→ ACTION NEEDED: run `supabase-migrations/2026-07-25-phase1-unique-sessions.sql`
      in the Supabase SQL editor** (project `olyhuecjtopwbovbtyri` isn't linked to the
      local CLI account, so it couldn't be applied automatically).
- [x] Prompt refactor: `app/lib/lesson-prompts.ts` — base persona + per-lesson modules,
      `composeLessonPrompt(lesson, ctx)` with slots for `studentProfile`,
      `priorAnalysis` (Phase 3) and `graderState` (Phase 5).
- [x] `LessonPage` updated: sends single message, hydrates history from `/api/session`,
      localStorage fallback removed.

**Exit criteria verified 2026-07-25** (live dev-server test, throwaway user, cleaned up):
start/message stream correctly with server-rebuilt context; injected `messages`/`history`
fields are ignored; free-tier lesson gate (403), message-length cap (400), and demo
turn limit (429) all enforced; conversation persists to `lesson_sessions` and survives
reload. Bonus fix: resume previously sent ONLY the synthetic resume message to the
model (no real history) — server-side rebuild fixed that too.

## Phase 2 — Spend controls

- [x] Daily per-user message cap across all lessons: `DAILY_MESSAGE_LIMIT` env,
      default 100. Fails open (with a logged error) until the migration runs, since
      per-lesson limits still bound each conversation.
- [x] Global kill switch: set `CHAT_PAUSED=true` and redeploy — chat returns 503
      with a friendly message before any Anthropic spend, even pre-auth.
- [x] Per-turn token usage captured from the stream and logged to `chat_usage`
      (one row per user per day: message_count, input_tokens, output_tokens) via
      the atomic `increment_chat_usage()` RPC.
- [x] Phase 2 migration applied and verified live 2026-07-25: token row written
      (525 in / 16 out on turn one), daily cap returns 429 at the limit.
- [ ] **ACTION NEEDED (you):** set a spend alert in the Anthropic console
      (console.anthropic.com → Settings → Limits) at a number that would annoy you.

**Exit:** worst-case daily bill ≈ users × DAILY_MESSAGE_LIMIT × ~$0.03/turn; chat
can be paused with one env flip. Cost per user per day is a one-row query:
`select * from chat_usage order by day desc`.

Verified 2026-07-25: kill switch returns 503 on both demo and user paths; full
Phase 1 regression suite passes with usage tracking in place; pre-migration
fail-open confirmed with clean log lines.

## Phase 3 — Student model (memory)

- [x] On lesson completion, Haiku extraction (`app/lib/student-profile.ts`) merges
      the lesson transcript into `users.student_profile` (jsonb): job, chosen tool,
      skill level, goals, prompts built, misconceptions, wins, notes. Runs alongside
      session analysis in `/api/analyze-lesson` (Promise.allSettled — either failing
      doesn't block the other). Fails open pre-migration.
- [x] Profile + previous lesson's `lesson_analyses` row composed into every
      subsequent lesson's system prompt via the Phase 1 `PromptContext` slots.
- [x] Scripted openers defer to memory: when the profile is present, Gojo is told to
      skip questions it already knows the answer to and reference what it remembers.
- [x] Bonus: `complete-lesson`'s analysis dispatch moved into `after()` (was
      fire-and-forget, killable on serverless) with request-origin base URL fallback.
- [ ] **ACTION NEEDED (you):** run
      `supabase-migrations/2026-07-25-phase3-student-profile.sql` in the Supabase
      SQL editor — adds `users.student_profile` (and puts `lesson_analyses` under
      source control for fresh environments).

**Exit verified 2026-07-25** (pre-migration test, throwaway user): completed Lesson 1
as a Hilo landscaping business owner with a search-engine misconception → Lesson 2
opened with "Last time, something clicked for you — the idea that AI is less like a
search engine and more like a well-read employee waiting for instructions." Profile
extraction parsed and attempted its write (blocked only by the missing column).
Re-verify the profile half after the migration. Ship this BEFORE public launch:
memory is the differentiator.

## Phase 4 — Free flip + launch surface

- [ ] Access collapses to: valid token → all 6 lessons. Tier checks, `maxLesson`
      branching, and the 3-question higher-tier cap removed.
- [ ] Six lesson closers rewritten: no $97 pitch; continue → next lesson; Lesson 6
      closes on the income-later hook (email list / "bring this to your team").
- [ ] Landing page: pricing cards + readiness quiz out; email capture is the one CTA.
- [ ] Stripe routes/webhook parked (not deleted), FAQ/terms swept for pricing.
- [ ] OG images + meta tags for link previews.

**Exit:** stranger goes email → Lesson 6 with zero mention of money.

## Phase 5 — Mastery gating

- [ ] Cheap grader checks transcript against the lesson's numbered goals.
- [ ] Continue unlocks on goals-met, not message count ≥ 4.
- [ ] Unmet goals fed into Gojo's context so it steers toward what's missing.

**Exit:** "won't move on until you get it" is mechanically true. Safe to ship
post-launch; real transcripts make grader tuning easier.

## Phase 6 — The loops (ongoing)

- [ ] Weekly aggregate digest of `lesson_analyses`: where students stall, recurring
      gaps → curriculum revision engine (makes the "living system" claim real).
- [ ] Re-engagement emails generated by Gojo from the student's own transcript
      (replaces the two static cron emails).
- [ ] Prompt notebook: prompts/workflows built in Lessons 4–5 saved as structured
      artifacts to a per-student page they keep.

---

## Known deferred items

- B2B/teams offering (the eventual monetization path — brief: "companies buy AI
  training that changes nothing").
- A/B prompt variants measured on completion rate (after Phase 6 digest exists).
- Public "Lesson 1 prompt" post as distribution wedge.
