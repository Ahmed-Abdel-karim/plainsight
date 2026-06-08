#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/driver"

npm install --no-audit --no-fund
npx playwright install chromium

if node -e "import('playwright').then(p => p.chromium.launch()).then(b => b.close())" 2>/tmp/codex-run-app-launch.err; then
  echo "Chromium launches cleanly."
  exit 0
fi

if grep -q "error while loading shared libraries" /tmp/codex-run-app-launch.err && ! sudo -n true 2>/dev/null; then
  mkdir -p /tmp/pwlibs
  cd /tmp/pwlibs
  apt-get download \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
    libdrm2 libgbm1 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libxrender1 libasound2t64 libatspi2.0-0t64 libexpat1 libxcb1 libxext6 \
    libpango-1.0-0 libcairo2 libgtk-3-0t64 libpangocairo-1.0-0 2>/dev/null || true
  for package in ./*.deb; do
    [ -e "$package" ] || continue
    dpkg-deb -x "$package" root
  done
  echo "Fetched missing Chromium libraries into /tmp/pwlibs."
  exit 0
fi

cat /tmp/codex-run-app-launch.err
exit 1
