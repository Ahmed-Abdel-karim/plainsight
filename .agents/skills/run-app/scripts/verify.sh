#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$(cd "$ROOT/../../.." && pwd)"
BASE="${BASE_URL:-http://localhost:3000}"
CITY="${1:-amsterdam}"
OUT="${OUT:-/tmp/plainsight-run-app}"
DEV_LOG="${DEV_LOG:-/tmp/plainsight-run-app-dev.log}"
SERVER_PID=""
PORT="${BASE##*:}"
PORT="${PORT%%/*}"

if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "BASE_URL must include an explicit numeric port: $BASE"
  exit 2
fi

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

mkdir -p "$OUT"
rm -f "$OUT/$CITY-"*.png "$OUT/report.json"

if [ ! -d "$ROOT/driver/node_modules/playwright" ]; then
  echo "Driver dependencies are missing. Run:"
  echo "  bash .agents/skills/run-app/scripts/setup.sh"
  exit 2
fi

if ! curl -sf -o /dev/null "$BASE/$CITY"; then
  echo "No server at $BASE; starting a temporary dev server."
  (
    cd "$APP"
    exec pnpm dev --hostname 127.0.0.1 --port "$PORT"
  ) >"$DEV_LOG" 2>&1 &
  SERVER_PID="$!"

  ready=false
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null "$BASE/$CITY"; then
      ready=true
      break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done

  if [ "$ready" != true ]; then
    echo "Dev server failed to become ready. Log:"
    tail -n 120 "$DEV_LOG" || true
    exit 3
  fi
fi

LIBS="/tmp/pwlibs/root/usr/lib/x86_64-linux-gnu"
[ -d "$LIBS" ] && export LD_LIBRARY_PATH="$LIBS:${LD_LIBRARY_PATH:-}"

cd "$ROOT/driver"
BASE_URL="$BASE" OUT="$OUT" node verify.mjs "$CITY"
