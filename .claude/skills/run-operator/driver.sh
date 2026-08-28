#!/usr/bin/env bash
# Agent driver for Operator (Next.js app). See SKILL.md in this directory.
#
# Usage (from repo root):
#   .claude/skills/run-operator/driver.sh smoke        # start, verify, screenshot, stop
#   .claude/skills/run-operator/driver.sh start        # start dev server on $PORT, wait until ready
#   .claude/skills/run-operator/driver.sh stop         # stop the server started by this script
#   .claude/skills/run-operator/driver.sh shot / out.png   # headless-Chrome screenshot of a route
#
# Env overrides: PORT (default 3100), SHOT_DIR (default $TMPDIR/operator-shots)
set -u

PORT="${PORT:-3100}"
BASE="http://localhost:$PORT"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TMP="${TMPDIR:-/tmp}"
PIDFILE="$TMP/operator-dev-$PORT.pid"
LOG="$TMP/operator-dev-$PORT.log"
SHOT_DIR="${SHOT_DIR:-$TMP/operator-shots}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

pass=0; fail=0
ok()   { echo "  PASS  $1"; pass=$((pass+1)); }
bad()  { echo "  FAIL  $1"; fail=$((fail+1)); }

start() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "already running (pid $(cat "$PIDFILE")) on $BASE"; return 0
  fi
  ( cd "$ROOT" && npm run dev -- -p "$PORT" >"$LOG" 2>&1 & echo $! >"$PIDFILE" )
  echo -n "waiting for $BASE "
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null "$BASE/"; then echo "— ready (pid $(cat "$PIDFILE"), log $LOG)"; return 0; fi
    echo -n "."; sleep 1
  done
  echo; echo "server never became ready — tail of $LOG:"; tail -20 "$LOG"; return 1
}

stop() {
  if [ -f "$PIDFILE" ]; then
    pkill -P "$(cat "$PIDFILE")" 2>/dev/null
    kill "$(cat "$PIDFILE")" 2>/dev/null
    rm -f "$PIDFILE"
    echo "stopped"
  else
    echo "no pidfile ($PIDFILE) — nothing to stop"
  fi
}

shot() {
  local route="${1:-/}" out="${2:-}"
  mkdir -p "$SHOT_DIR"
  [ -n "$out" ] || out="$SHOT_DIR/$(echo "$route" | tr -s '/' '-' | sed 's/^-//;s/^$/landing/').png"
  [ "$out" = "${out#/}" ] && out="$PWD/$out"
  "$CHROME" --headless --disable-gpu --window-size=1280,1600 --virtual-time-budget=8000 \
    --screenshot="$out" "$BASE$route" 2>/dev/null
  [ -s "$out" ] && echo "screenshot: $out" || { echo "screenshot FAILED for $route"; return 1; }
}

# Mint a demo JWT and screenshot the real lesson UI at /recruit/<n>?token=...
# Needs .env.local with at least ACCESS_TOKEN_SECRET (any value works for local UI).
shot_lesson() {
  local n="${1:-1}" token
  token=$(curl -s "$BASE/api/demo-token" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  [ -n "$token" ] || { echo "could not mint demo token — set ACCESS_TOKEN_SECRET in .env.local"; return 1; }
  mkdir -p "$SHOT_DIR"
  "$CHROME" --headless --disable-gpu --window-size=1280,1200 --virtual-time-budget=8000 \
    --screenshot="$SHOT_DIR/lesson-$n.png" "$BASE/recruit/$n?token=$token" 2>/dev/null
  echo "screenshot: $SHOT_DIR/lesson-$n.png"
}

smoke() {
  start || exit 1
  echo "-- smoke checks against $BASE --"

  local code ctype
  # Apostrophes are HTML-escaped (&#x27;) in the rendered output, so match around them.
  curl -s "$BASE/" | grep -q "watch AI" \
    && ok "landing page renders hero copy" || bad "landing page missing hero copy"

  ctype=$(curl -s -o /dev/null -w '%{content_type}' "$BASE/opengraph-image")
  [ "$ctype" = "image/png" ] && ok "/opengraph-image serves PNG" || bad "/opengraph-image content-type: $ctype"

  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/recruit/1")
  [ "$code" = 200 ] && ok "/recruit/1 renders ($code)" || bad "/recruit/1 returned $code"

  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/verify-token" \
    -H 'content-type: application/json' -d '{"token":"garbage"}')
  [ "$code" = 401 ] && ok "verify-token rejects garbage (401)" || bad "verify-token garbage returned $code"

  if [ -f "$ROOT/.env.local" ]; then
    # Keyed checks: demo token mint + verify roundtrip (needs only ACCESS_TOKEN_SECRET).
    local token
    token=$(curl -s "$BASE/api/demo-token" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    [ -n "$token" ] && ok "demo-token mints a JWT" || bad "demo-token returned no token (check ACCESS_TOKEN_SECRET)"
    if [ -n "$token" ]; then
      code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/verify-token" \
        -H 'content-type: application/json' -d "{\"token\":\"$token\"}")
      [ "$code" = 200 ] && ok "verify-token accepts minted token (200)" || bad "minted token verify returned $code"
    fi
  else
    echo "  SKIP  no .env.local — API routes touching Supabase/JWT/Anthropic will 500 (expected)"
  fi

  shot / && shot /recruit/1

  stop
  echo "-- $pass passed, $fail failed --"
  [ "$fail" = 0 ]
}

case "${1:-smoke}" in
  start) start ;;
  stop)  stop ;;
  shot)  start >/dev/null && shot "${2:-/}" "${3:-}" ;;
  shot-lesson) start >/dev/null && shot_lesson "${2:-1}" ;;
  smoke) smoke ;;
  *) echo "usage: $0 [smoke|start|stop|shot <route> [out.png]|shot-lesson <1-6>]"; exit 2 ;;
esac
