#!/usr/bin/env bash
# One-time setup for the browser-driven verifier: install Playwright + Chromium,
# and (only if Chromium can't launch for lack of system libs and there's no root)
# fetch those libs rootlessly. Safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/driver"

echo "== installing Playwright (isolated; not added to the app's package.json) =="
npm install --no-audit --no-fund

echo "== installing Chromium =="
npx playwright install chromium

echo "== launch smoke test =="
if node -e "import('playwright').then(p=>p.chromium.launch()).then(b=>b.close())" 2>/tmp/pw-launch.err; then
  echo "Chromium launches cleanly."
  exit 0
fi

if grep -q "error while loading shared libraries" /tmp/pw-launch.err && ! sudo -n true 2>/dev/null; then
  echo "== missing system libs and no root — fetching them rootlessly to /tmp/pwlibs =="
  mkdir -p /tmp/pwlibs && cd /tmp/pwlibs
  apt-get download \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
    libdrm2 libgbm1 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libxrender1 libasound2t64 libatspi2.0-0t64 libexpat1 libxcb1 libxext6 \
    libpango-1.0-0 libcairo2 libgtk-3-0t64 libpangocairo-1.0-0 2>/dev/null || true
  for d in *.deb; do dpkg-deb -x "$d" root; done
  echo "Libs extracted; verify.sh exports LD_LIBRARY_PATH automatically."
else
  echo "Chromium failed to launch for a reason other than missing libs:"; cat /tmp/pw-launch.err
  exit 1
fi
