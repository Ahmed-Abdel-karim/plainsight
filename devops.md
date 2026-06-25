# DevOps state

The operational picture for Plainsight: what's wired, what's prepared-but-dormant,
what's left to do, and the traps. Plainsight is a **portfolio app on Vercel's free
tier** — no backend, no database; all city data ships as static files and all
filtering happens client-side by design.

Stack: **Next.js 16.2.6** (App Router, PPR / `cacheComponents`), **React 19**,
**Node 24**, **pnpm 11.0.9**, MapLibre/WebGL map.

Legend: ✅ active · 🟡 prepared, not yet activated · ⬜ not started · ⚠️ caveat

---

## Hosting & deploy

- **Vercel**, free tier. Deploys run **through CI via the Vercel CLI** (`vercel pull`
  / `build` / `deploy --prebuilt`), not Vercel's Git integration.
- `vercel.json` sets `git.deploymentEnabled: false` — ⚠️ **Vercel's own Git
  auto-deploy is intentionally OFF.** If anyone connects the repo in the Vercel
  dashboard, you'll get double deploys. Keep it off; CI is the only deploy path.
- Preview deploy on every PR (comments the URL); production deploy on push to
  `master`.

## CI/CD — `.github/workflows/ci-cd.yml`

Pipeline: `guard → {quality, e2e, lighthouse} → {deploy-preview | deploy-production}`

| Job                 | Does                                                           | Gates deploy?             |
| ------------------- | -------------------------------------------------------------- | ------------------------- |
| `guard`             | same-repo event check (forked PRs run nothing)                 | —                         |
| `quality`           | `format:check`, `lint:strict`, `tsc --noEmit`, `test`, `build` | ✅ yes                    |
| `e2e`               | Playwright (`playwright install chromium` → `test:e2e`)        | ✅ yes                    |
| `lighthouse`        | perf gate (build → `pnpm lhci`)                                | ❌ **no** (PR check only) |
| `deploy-preview`    | Vercel preview on PRs                                          | —                         |
| `deploy-production` | Vercel prod on `master`                                        | —                         |

- Least-privilege `permissions`; `concurrency` cancels in-flight runs per ref.
- ⚠️ **Forked PRs**: `guard` skips the whole pipeline so secrets stay unreachable —
  external contributors get no CI/preview.

## Git hooks (husky)

- `pre-commit`: `lint-staged`
- `commit-msg`: `commitlint` (Conventional Commits)
- `pre-push`: `lint:strict` + `tsc --noEmit` + `test`

## Observability — Sentry 🟡

Fully wired in code but **dormant until env vars are set**:

- `instrumentation.ts` (`register` + `onRequestError`), `instrumentation-client.ts`,
  `sentry.server.config.ts`, `sentry.edge.config.ts`, `withSentryConfig` in
  `next.config.ts`.
- Errors-only (`tracesSampleRate: 0`), **production-only** (`NODE_ENV==='production'`),
  PII off, same-origin tunnel at `/monitoring` (ad-blocker-proof, CSP-friendly).
- ⚠️ The SDK ships in the bundle even with no DSN (it no-ops). 🟡 **To activate:**
  set `NEXT_PUBLIC_SENTRY_DSN` (Production) + `SENTRY_AUTH_TOKEN` (build, for
  source-map upload) in Vercel.

## Security ✅

`next.config.ts` sets, on all routes: **CSP** (scoped to self + openfreemap tiles +
Unsplash images), **HSTS**, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options: DENY`. `/city-assets/*` served `immutable, max-age=31536000`.
⚠️ CSP `connect-src`/`img-src` are hand-maintained — adding a new external origin
(analytics, font host, API) requires editing the CSP or it'll be blocked.

## SEO ✅

`app/robots.ts`, `app/sitemap.ts`, `app/not-found.tsx`, `opengraph-image`, social
metadata — all committed.

## Performance tooling

| Tool             | Command                             | Notes                                                                     |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| Bundle analyzer  | `pnpm analyze`                      | Turbopack-native (`next experimental-analyze`); serves a UI on `:4000`    |
| Local Lighthouse | `pnpm lighthouse /london [desktop]` | `scripts/lighthouse.mjs`; needs `pnpm start` running first                |
| Lighthouse CI    | `pnpm lhci`                         | `scripts/lhci.mjs` + `lighthouserc.json`; runs in the `lighthouse` CI job |

**CI perf gate** (`lighthouserc.json`): 3 runs each on `/` + `/london`.

- ✅ **error**: `resource-summary:script:size ≤ 800 KiB` (first-load JS; current home
  453 KiB / london 726 KiB), `cumulative-layout-shift ≤ 0.1`.
- 🟡 **warn** (non-blocking, noisy on headless WebGL): LCP, TBT, TTI.
- Reports upload to Lighthouse temporary-public-storage (link in job logs).

Baseline (median of 3, prod build): desktop **99–100**, home mobile **92**, scene
mobile **~44** — the scene-mobile score is **map-bound** (maplibre + WebGL init
dominate), not bundle-bound, so JS cuts won't move it much.

## Testing ✅

`vitest` (unit/integration) + `vitest-axe` (a11y) + `@playwright/test` (e2e + axe) +
`msw`. a11y split: structural axe in vitest integration, contrast/focus in e2e.

## Environment variables

| Var                                                    | Where                               | Status                                                 |
| ------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_E2E`                                      | `.env` (committed)                  | ✅ build flag                                          |
| `NEXT_PUBLIC_CITY_ASSET_BASE_URL`                      | `.env` (committed, `=/city-assets`) | ✅ same-origin default; set to a CDN origin to offload |
| `NEXT_PUBLIC_SENTRY_DSN`                               | Vercel (Production)                 | 🟡 empty — set to activate Sentry                      |
| `SENTRY_AUTH_TOKEN`                                    | Vercel / CI (build secret)          | 🟡 unset — needed for readable prod stack traces       |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | GitHub Actions secrets              | ✅ used by deploy jobs                                 |
| `LHCI_GITHUB_APP_TOKEN`                                | GitHub Actions secret               | ⬜ optional — adds inline Lighthouse PR status checks  |

`.env` holds only non-secret `NEXT_PUBLIC_*` build defaults (committed on purpose).
Secrets live in Vercel / GitHub, never in the repo.

---

## TODO — integrations to finish

1. 🟡 **Activate Sentry**: add `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` in Vercel.
2. ✅ **Test fixes + scene refactor committed** (`f7dbf64`): the 3 failures from
   `2d51df6` are fixed (2 toast-dedup assertions scoped to the notifications region +
   the browse empty-state button renamed "Reset filters" → "Show all listings"), and
   the scene state-machine migration + provider-scope move to the scene layout landed
   with `price-histogram.tsx` formatted. The full quality gate passes locally:
   `format:check`, `lint:strict`, `tsc --noEmit`, `test` (147/147), `build`.
3. 🟡 **Merge `chore/issue-tracking` → `master`** to ship the above plus the
   issue-tracking infra (`.github/ISSUE_TEMPLATE/`, `.github/labels.sh`,
   `.claude/skills/issue/`) and doc updates (`CLAUDE.md`, `devops.md`). The push to
   `master` is what triggers `deploy-production` (gated on `quality` + `e2e`).
4. ⬜ **`LHCI_GITHUB_APP_TOKEN`** for inline Lighthouse status checks on PRs (optional).
5. ⬜ **Tighten the perf gate** later: per-route byte budgets (currently one global
   ceiling), promote LCP/TBT warn→error once CI variance is known, add a desktop run.
6. ⬜ **Asset CDN**: point `NEXT_PUBLIC_CITY_ASSET_BASE_URL` at object storage / CDN
   if data delivery needs to scale (origin must allow browser GET from the app origin).
7. ⬜ **Worker rows in IndexedDB** (future, only if needed): today the worker keeps
   every visited city's parsed listing rows in memory for the session (~21 MB JSON
   for all 4 cities; London alone ~16 MB). If that heap ever becomes a problem, use
   IndexedDB as a disk cache: keep only the **active** city's rows in memory, store
   the rest on disk, and read them back on revisit instead of re-downloading. Wins:
   smaller heap, no refetch on reload or after leaving to the home picker. Costs:
   IndexedDB is async and copies the data on every read/write (London's 16 MB isn't
   free to (de)serialize), and it's a second cache to keep in sync. Cleanup is easy:
   key each entry by `[slug, snapshotId]` and drop any whose `snapshotId` no longer
   matches the manifest (or clear the store); browsers also evict it on their own.
   For 4 cities this is overkill — note it as a scaling option, don't build it yet.

## Caveats

- ⚠️ **WSL + Lighthouse**: chrome-launcher mis-resolves its temp dir and writes literal
  `C:\Users\…lighthouse.*` profile folders into the repo root unless
  `--user-data-dir=/tmp/lh-chrome` is set. The wrapper scripts set it; `.gitignore`
  guards `C:*`, `.lighthouseci/`, `*.report.json|html` as a backstop. Don't run raw
  `lighthouse`/`lhci` without those flags.
- ⚠️ **No system Chrome** locally — Lighthouse uses **Playwright's chromium** (resolved
  via `@playwright/test`). Headless WebGL renders via SwiftShader, so map GPU timings
  are directional, not device-accurate.
- ⚠️ **PPR / `cacheComponents`** is incompatible with server-side cookie theming —
  theming stays on `next-themes` (client). Don't reintroduce cookie-based theme.
- ⚠️ **Static-files-only by design** — no DB, no query endpoint, all filtering client-
  side. Don't add a backend without revisiting the whole data architecture.
- ⚠️ **CSP is allowlist-based** — any new external origin must be added to
  `next.config.ts` or the browser blocks it.
- ⚠️ Pre-existing **empty `currency` Intl `RangeError`** surfaces in SSR/hydration —
  known, not a regression.
