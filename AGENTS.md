<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Current work

Phased upgrade in progress — see `ROADMAP.md` for the plan and current phase status. Update the status table there as phases complete.
<!-- END:nextjs-agent-rules -->

# Operator

A free, email-gated conversational AI course: six lessons taught by a Claude-powered
teacher persona ("Gojo") that remembers each student across lessons. The product
direction (2026-07-25) is **free to use, income later** — the asset being built is an
email list of AI-skeptic learners plus proof that conversational learning beats video.
Guiding test for any feature: *does this make the system know the student better than
it did yesterday?*

Critical user flow that must never silently break:
**waitlist signup → magic-link email (Resend) → `/recruit/1`–`/recruit/6` lesson chat
(streamed) → per-lesson grading → completion.**

## Architecture truths (not inferable from a quick read)

- **The server owns the conversation.** `/api/chat` accepts only
  `{ action, message?, lesson, token }` and rebuilds history from `lesson_sessions`.
  Never add a path that trusts client-supplied history. The one exception is the
  landing-page demo (shared token marked `demo: true`, hard-bounded), which is
  deliberate.
- **Auth is a jose JWT** signed with `ACCESS_TOKEN_SECRET`, delivered by magic link.
  There is no Supabase Auth and no RLS tenant boundary: Supabase is accessed only
  server-side via the service-role key (`app/lib/supabase.ts`). Application code is
  the entire authorization boundary — nothing DB-touching may move client-side.
- **Spend controls are load-bearing** (Phase 2): `DAILY_MESSAGE_LIMIT` daily cap,
  `CHAT_PAUSED=true` kill switch (503 before any Anthropic spend), and per-turn token
  logging to `chat_usage` via the `increment_chat_usage()` RPC. Don't weaken these.
- **Chat stream protocol:** goal/grader state rides as a `\x1f`-delimited tail on the
  text stream to the client. Client (`app/components/LessonPage.tsx`) and server must
  change together.
- **Mastery gating is a teaching device, not a lock.** Direct URL access to any lesson
  is open by design (Phase 4 free flip). Don't "fix" it by locking lessons.
- **Stripe/checkout/webhook routes are parked, not dead code.** They're unreachable
  from the UI on purpose and will return with monetization. Don't delete them.
- **Fail-open is deliberate** in several places (daily cap pre-migration, profile
  extraction, grading): an intelligence/limits feature failing must never block a
  student's chat. Log and continue.
- Prompts are composed in `app/lib/lesson-prompts.ts` via
  `composeLessonPrompt(lesson, ctx)` with slots for `studentProfile`, `priorAnalysis`,
  and `graderState`. Lesson goals live structured in `app/lib/lesson-goals.ts`.
- Cron: `/api/cron/re-engage` runs daily 14:00 UTC (see `vercel.json`), guarded by
  `CRON_SECRET`.

## Database migrations

Migrations are plain SQL files in `supabase-migrations/`, applied **manually in the
Supabase SQL editor** — the project (`olyhuecjtopwbovbtyri`) is not linked to the
local Supabase CLI. When a change needs a migration: write the file, update
`supabase-schema.sql` to match, and tell the user to run it. Code should tolerate the
pre-migration state (fail open, logged).

## Commands

- Dev server: `npm run dev` (needs `.env.local`; see env vars below)
- Lint: `npm run lint`  ·  Typecheck: `npx tsc --noEmit`  ·  Build: `npm run build`
- Grader eval fixtures: `npm run grade-eval` (uses `.env.local`; calls Anthropic —
  costs a little money). This is the only automated test surface; there is no unit
  test suite.

Behavioral verification = run the dev server and exercise the real flow (curl the API
routes or drive the browser). ROADMAP.md records how each phase's exit criteria were
verified live — match that standard.

Env vars (all server-side, in `.env.local` / Vercel): `ANTHROPIC_API_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ACCESS_TOKEN_SECRET`,
`RESEND_API_KEY`, `NOTIFY_EMAIL`, `ADMIN_KEY`, `CRON_SECRET`, `DAILY_MESSAGE_LIMIT`,
`CHAT_PAUSED`, `NEXT_PUBLIC_BASE_URL`, and the parked `STRIPE_*` set.

## Docs

- `ROADMAP.md` — phase plan + status table (keep it updated) and outstanding manual
  actions (pending migrations, console alerts).
- `docs/superpowers/` — design specs and implementation plans for larger features.
