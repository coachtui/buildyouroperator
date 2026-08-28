---
name: run-operator
description: Run, start, launch, smoke-test, or screenshot the Operator app (Next.js dev server, landing page, lesson pages, chat API). Use when asked to run the app, verify a change works in the browser, or take a screenshot.
---

# Run Operator

Operator is a Next.js 16 app (App Router, Turbopack). The driver is
`.claude/skills/run-operator/driver.sh` — it launches the dev server on
**port 3100** (3000 is often taken by another project on this machine),
runs curl smoke checks, and takes headless-Chrome screenshots. All paths
below are relative to the repo root.

## Prerequisites

- Node 26 / npm 11 (already on this machine), `npm install` once.
- Google Chrome at `/Applications/Google Chrome.app` (used headless for
  screenshots — no chromium-cli or Playwright needed).
- `.env.local` for anything beyond the static UI — see "Env tiers" below.

## Run (agent path)

```bash
.claude/skills/run-operator/driver.sh smoke
```

Starts the server, checks landing page copy, `/opengraph-image` PNG,
`/recruit/1`, verify-token rejection, and — when `.env.local` exists —
mints a demo JWT and verifies it roundtrips. Screenshots land in
`$TMPDIR/operator-shots/` (override with `SHOT_DIR=`). Exits nonzero on
any failure and always stops the server.

Other commands:

```bash
.claude/skills/run-operator/driver.sh start          # server up on :3100, waits until ready
.claude/skills/run-operator/driver.sh shot / out.png # screenshot any route
.claude/skills/run-operator/driver.sh shot-lesson 1  # mint demo token, screenshot real lesson UI
.claude/skills/run-operator/driver.sh stop           # kill the server it started
```

Server log: `$TMPDIR/operator-dev-3100.log`. Read it whenever an API
route returns 500.

## Env tiers (what runs with what)

1. **No `.env.local`:** landing page, `/recruit/N` (shows the
   "Access required" gate), `/opengraph-image`, and verify-token
   rejection all work. Any route importing `app/lib/supabase.ts`
   (chat, session, waitlist…) 500s at module load with
   `Error: supabaseUrl is required.` — expected, not a bug.
2. **Dummy secret** — `echo 'ACCESS_TOKEN_SECRET=anything' > .env.local`:
   unlocks demo-token minting, the verify-token roundtrip, and
   `shot-lesson` (the real lesson intro UI renders). Chat still can't
   stream. **Delete the dummy file when done** so it never masks real env.
3. **Real keys** (`ANTHROPIC_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, …): full chat/grading flow. Refresh
   with `vercel env pull --environment=preview .env.local` (the repo is
   linked; vars are only set for Preview/Production, so plain
   `vercel env pull` yields an empty development file — a known trap).
   These are the PRODUCTION Supabase and Anthropic credentials: local
   chat turns write to the real database and cost real tokens.

## Run (human path)

`npm run dev` → http://localhost:3000 (or next free port). Same env
tiers apply.

## Test

There is no unit test suite. `npm run grade-eval` runs the grader eval
fixtures — needs a real `ANTHROPIC_API_KEY` in `.env.local` and costs
money; don't run it casually.

## Gotchas

- Port 3000 is frequently occupied by an unrelated Next 15 server on
  this machine; the driver pins 3100. Override with `PORT=`.
- Server-rendered HTML escapes apostrophes (`don&#x27;t`) — grep for
  fragments without apostrophes when asserting on page copy.
- Without env, the landing page still shows a Next.js dev-overlay
  "1 Issue" badge in screenshots: the `DemoChat` component's
  `/api/demo-token` fetch 500s. Cosmetic; the page itself is fine.
- `/recruit/N` reads the JWT from the `?token=` query param
  (`app/components/LessonPage.tsx`). No token → "Access required" gate,
  which is also the designed behavior in production.
- Chrome headless prints `task_policy_set` / `installwebapp` errors to
  stderr on this macOS version — harmless, the screenshot still lands.

## Troubleshooting

- **`POST /api/chat` returns a 500 HTML error page** → missing
  `.env.local`; log shows `Error: supabaseUrl is required.` at
  `app/lib/supabase.ts:6`.
- **`GET /api/demo-token` 500** → `ACCESS_TOKEN_SECRET` unset.
- **`demo-token mints a JWT` FAILs in smoke** → `.env.local` exists but
  has no `ACCESS_TOKEN_SECRET`.
- **Driver hangs at "waiting for …"** → check
  `$TMPDIR/operator-dev-3100.log`; usually a port clash (something else
  on 3100) or `npm install` never ran.
