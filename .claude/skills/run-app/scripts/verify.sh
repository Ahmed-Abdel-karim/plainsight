#!/usr/bin/env bash
# Browser-drive the Plainsight scene and write dark/light/mobile screenshots
# plus a PASS/FAIL report. Reuses a running dev server; starts one only if needed.
#
#   scripts/verify.sh [city]      # default: amsterdam
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # .claude/skills/run-app
APP="$(cd "$ROOT/../../.." && pwd)"                       # project root
BASE="${BASE_URL:-http://localhost:3000}"
CITY="${1:-amsterdam}"

# Reuse a running dev server; next dev refuses to start a second instance.
if ! curl -sf -o /dev/null "$BASE/$CITY"; then
  echo "No server at $BASE — starting 'pnpm dev'…"
  ( cd "$APP" && pnpm dev >/tmp/plainsight-dev.log 2>&1 & )
  for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/$CITY" && break; sleep 1; done
fi

# Sandboxes without a system Chrome may lack Chromium's shared libs (libnss3 …).
# setup.sh fetches them rootlessly to /tmp/pwlibs; use them if present.
LIBS="/tmp/pwlibs/root/usr/lib/x86_64-linux-gnu"
[ -d "$LIBS" ] && export LD_LIBRARY_PATH="$LIBS:${LD_LIBRARY_PATH:-}"

cd "$ROOT/driver"
BASE_URL="$BASE" exec node shoot.mjs "$CITY"
