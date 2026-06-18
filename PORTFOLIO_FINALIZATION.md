# Plainsight — Portfolio Finalization Plan

> **Status:** Living reference document. Each workstream below is intended to be
> its own long, research-backed discussion. This file captures the scope
> decision, the grounding research, the current-state audit, and the prioritized
> roadmap so we never re-derive any of it. We expand one workstream at a time,
> in priority order, confirming between steps (per the project's step-by-step rule).

---

## Context — why this work exists

Plainsight is a feature-complete Next.js 16 / React 19 short-term-rental market
explorer (MapLibre WebGL map, H3 hex price layer, browse lens, XState v5 actor
state). The goal now is **not** new product capability — it is to finalize and
**package** the existing work so it stands as a flagship portfolio project that
senior/staff frontend engineers (the people doing final-round interview
evaluation) will respect when they open the GitHub repo.

**Two decisions are locked (confirmed by the user):**

1. **Freeze the feature set.** No new features. All effort goes into polish,
   quality, infrastructure, deployment, and documentation.
2. **Deploy live to Vercel** so there is a clickable demo URL.

**One user-added priority:** Architecture docs that _justify the engineering
decisions_ and lay out future enhancements — explicitly framed to show the work
was **AI-assisted, not "vibe-coded."** ADRs that surface the _human_ decisions
behind the AI assistance are a headline deliverable, not an afterthought.

**Refactor depth is deliberately left OPEN** — to be resolved inside the
clean-code workstream discussion (Workstream 2).

---

## Scope verdict — already more than enough; do NOT add features

The instinct to "add more features" is the wrong move here, and the hiring-side
research is unusually consistent on why:

- **Depth + finish beats breadth.** "One polished project beats ten unfinished
  ones… 3–5 polished, well-documented, deployed projects you understand at every
  level is what gets callbacks. A portfolio full of half-built experiments says
  you cannot finish things." Adding a new feature _dilutes_ the "finished and
  considered" signal that is doing the heavy lifting.
- **Interactive data-viz + mapping is specifically named as the genre that
  signals senior mastery** (canonical example: Yan Holtz / Datadog — beautiful
  data viz + live demos + write-ups of technical challenges).
- **Senior vs. mid is self-reflection, not feature count:** the write-up
  answering _what problem, what was hard, what trade-offs, what I'd do
  differently_. That narrative is the final-interview signal.

**Sources (for the README/write-up later, and for our own reference):**

- https://hakia.com/skills/building-portfolio/ — "Developer Portfolio Guide 2026"
- https://www.frontendmentor.io/articles/building-an-effective-frontend-developer-portfolio--7cE8BfMG_
- https://rockstardeveloperuniversity.com/developer-portfolio-project-ideas/ — Yan Holtz example, data-viz framing
- https://rocketdevs.com/blog/frontend-developer-portfolios — how employers evaluate FE portfolios
- https://www.codecademy.com/resources/blog/how-to-make-your-front-end-developer-portfolio-stand-out

**Why Plainsight clears the bar already** — it has the things that are hard to
fake and that most portfolio projects lack:

- Client-side **WebGL map** (MapLibre) with H3 hex aggregation, neighbourhood
  choropleth, and a per-listing circle layer GPU-filtered live.
- **62k-row virtualization** with sub-300ms filter/sort — a real perf constraint, solved.
- **XState v5 actor architecture** with explicitly _designed_ transition gating
  (`docs/map-machine-transition-gating.md`) — documented _before_ it was coded.
- **Layered data-tier** (ports/adapters, lazy tiers, PPR / `cacheComponents`).
- **Accessibility as first-class** (axe tests, role/name queries) — not bolted on.

**The real risk is the inverse of "too little scope": the depth is currently
invisible.** A reviewer lands on a generic Create-Next-App README, no live link,
no CI, no decision narrative. The packaging — not the feature set — is the gap.

---

## Current-state audit (captured from codebase exploration — do not re-derive)

### Tech stack (from `package.json`)

- **Next.js 16.2.6**, **React 19.2.4**, **TypeScript 5** (strict).
- **XState 5.32.1** (actor-based, proper v5 `setup()` usage).
- Map/geo: **MapLibre GL 5.24**, **react-map-gl 8.1**, **h3-js 4.4**, d3-array, geojson.
- UI: **Tailwind CSS 4**, shadcn/ui (Radix), CVA, lucide-react, next-themes.
- Data/state: **TanStack Query 5.101**, **TanStack Virtual 3.14**, Zustand 5
  (ephemeral map hover state), proxy-memoize, **nuqs 2.8** (URL state).
- Tooling/test: **Vitest 4.1** + jsdom, Testing Library, **vitest-axe**,
  ESLint 9 (flat) + Prettier 3.8, **Husky 9** + commitlint, **Sentry 10.58**
  (wired but `enabled: false`).

### Architecture (strong — the portfolio centerpiece)

- **4-layer downward-only imports:** `app/` → `components/` → `data/`, `lib/`.
- **Feature folder + single `index.ts` barrel** (components only; utils/hooks via
  direct import to respect the `"use client"` boundary). See `CLAUDE.md`.
- **XState v5 actors** for scene state: root machine (nav lifecycle), map actor
  (`loading → ready → interactive/suppressed`, gates pointer interaction during
  city transitions), city actor (spawned per slug, owns results + analytics
  worker), UI actor (lens/scope/filters), session-persistent worker actor.
- **Transition gating** designed in `docs/map-machine-transition-gating.md` — the
  machine itself enforces the gate (handlers only live on `interactive`), so it
  can't be breached from the view. Staff-level state modeling.
- **Data tier:** `data/loaders.ts` sole IO entry; `data/repository/` swap seam
  (static-json now, postgres wired); `data/contract.ts` locks the schema shared
  with the build pipeline. Static per-city tiers in `public/data` / `data/cities`
  (`{slug}-meta.json`, `-aggregates.json`, `-boundaries.geojson`, `-points.geojson`,
  `-analytics.json`). Immutable snapshots → compatible with `cacheComponents`.
- 4 launch cities (Sept 2025 Inside Airbnb snapshots): London (~62k listings —
  the perf target), Berlin (~9.3k), Manchester (~6.6k), Amsterdam (~5.9k).

### Existing tests (~20 files; honest, behavior-focused)

- Unit (node project): `lib/utils`, `lib/search-params`, `lib/filters`,
  `lib/hex/aggregate`, `lib/hex/resolution`, `data/selectors`, `data/loaders`,
  `data/repository`.
- Integration (dom/jsdom project): `market-header`, `city-picker`, browse
  (`listing-card`, `listing-detail-body`, `browse-summary`, `sort-control`),
  `analysis/kpi-row`, `map-legend`, `home-view`.
- A11y: `*.a11y.test.tsx` with **vitest-axe** (`toHaveNoViolations`).
- `vitest.setup.ts`: ResizeObserver polyfill, jest-dom + axe matchers, RTL cleanup.
- Two-project vitest config (node vs dom) — sophisticated, deliberate.
- **Gap:** no E2E (Playwright). WebGL/pointer/deep-link/theme verified manually
  via the `run-app` skill (honest, but a reviewer will note the absence).

### Gaps to close (the actual work)

- ❌ **No CI/CD.** No `.github/workflows/`. Tests are local-only via Husky
  pre-commit (skippable with `--no-verify`). **Biggest single gap.**
- ❌ **Generic README** — Create-Next-App boilerplate; doesn't say what
  Plainsight is, no screenshots, no live link, no "why."
- ❌ **No LICENSE.**
- ❌ **No architecture/decision docs surfaced for reviewers** (the design docs
  exist under `docs/` but aren't framed as ADRs / decision justification).
- ❌ **Not deployed** — no live URL; `next.config.ts` is build-ready
  (`outputFileTracingIncludes` bundles city data) but Vercel isn't set up.
- ⚠️ **Sentry wired but disabled** — decide whether to enable for the live deploy.
- ⚠️ **No CHANGELOG / release notes** (optional, low priority).

### Conventions already in place (preserve these)

- Conventional commits (`feat:`/`fix:`/`refactor:`/`test:`/`chore:`), incremental,
  no force-push/history rewrites.
- `eslint.config.mjs` flat config; deliberate `no-explicit-any: off` (needed for
  polymorphic machine events); `lint:strict` = `--max-warnings=0`.
- tsconfig `strict: true`, `@/*` path alias. **No `typecheck` script** — use
  `npx tsc --noEmit`.

---

## Prioritized roadmap

Order is locked (user-confirmed). Each row is its own future deep-dive
discussion + research session — we do **not** execute them ahead of their turn.

| #   | Workstream                                   | Why it's here in the order                                                                                                                                                      |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Testing strategy doc + green baseline**    | Defines the _goal_ (user's "no goalless tests" rule) and the safety net for everything after. Cheap, low-risk, doubles as a portfolio artifact.                                 |
| 2   | **Clean code / patterns / consistency pass** | Core quality work, done _inside_ the net. Depth still OPEN.                                                                                                                     |
| 3   | **Targeted test backfill**                   | Only gaps #1 named + contracts #2 made worth pinning. Goal-driven, not coverage-chasing.                                                                                        |
| 4   | **CI (GitHub Actions)**                      | Locks the green state (lint + typecheck + test + build on PR). Closes the biggest gap.                                                                                          |
| 5   | **Vercel deploy**                            | Live clickable URL. Enables real screenshots for the README.                                                                                                                    |
| 6   | **Documentation**                            | README + `ARCHITECTURE.md`/ADRs (decision justification + honest AI-assisted narrative) + future enhancements + LICENSE. Last, so links/screenshots reflect the deployed state. |
| 7   | **Final QA**                                 | `run-app` visual + a11y sweep (dark/light/mobile).                                                                                                                              |

### Workstream detail & open questions (to resolve in each discussion)

**1. Testing strategy + green baseline**

- Write `docs/testing-strategy.md`: pure kernels (`lib/filters`, `lib/hex`,
  browse sort) → unit; public component behavior (role/name queries, axe) →
  integration; WebGL/pointer/deep-link/theme → manual `run-app`; the node/dom
  vitest split and _why_. State the philosophy: tests pin _contracts_, not
  implementation.
- Verify baseline green: `lint:strict`, typecheck, `vitest`, `build`. **DONE — see
  Session log below.**
- Open Qs: E2E approach; machine-test priority; coverage-target stance. **Deferred
  to the dedicated testing discussion — see "Open testing decisions" below.**

**2. Clean code / patterns / consistency pass** _(depth OPEN — decide first)_

- Conservative polish (readability, naming, dead code, comments, enforce
  barrel/`"use client"` conventions; no behavior change) vs. also structural
  refactor (reorganize modules/boundaries that drift from the architecture).
- Open Qs: which files/areas drift most? Establish a consistency checklist first.
  Likely needs a fresh audit pass when we get here.

**3. Targeted test backfill**

- Driven entirely by #1's gaps + #2's changes. No blind test-writing.

**4. CI (GitHub Actions)**

- Jobs: install (pnpm) → lint:strict → typecheck (`tsc --noEmit`) → test → build.
  PR + main.
- Open Qs: caching strategy, Node/pnpm versions, whether to gate Vercel deploy on
  CI green, concurrency cancellation. (Context7 for current Actions syntax.)

**5. Vercel deploy**

- Open Qs: project/env setup, large static data tiers + `outputFileTracingIncludes`
  behavior on Vercel, image optimization (Unsplash remotePatterns already scoped),
  enable Sentry?, custom domain?, preview deploys per PR. (Context7 for Vercel + Next 16.)

**6. Documentation** _(includes the user's headline ask)_

- `README.md`: what Plainsight is, the problem, live demo link, screenshots
  (dark/light/mobile), tech stack + _why_, architecture diagram, local setup,
  honest data/snapshot framing, the trade-offs/"what I'd do differently" write-up.
- `ARCHITECTURE.md` + ADRs: justify the human decisions — XState actors over
  hooks-coordination, the transition-gating design, ports/adapters data seam,
  data-tier split, PPR/`cacheComponents`, node/dom test split. Surface the
  existing `docs/map-machine-transition-gating.md` as a worked example.
- An honest **"How this was built — AI-assisted engineering"** section: AI as a
  tool under human architectural direction, _not_ vibe-coded. The ADRs are the proof.
- **Future enhancements** section (the postgres swap seam, more cities, real
  E2E, live data path, etc.).
- `LICENSE` (MIT recommended).

**7. Final QA**

- `run-app` skill: dark/light/mobile screenshots, theme swap in place, map
  renders, a11y spot-check. Produce the screenshots the README needs.

---

## Session log — grounded findings (recorded; not yet decided)

### Baseline established — ALL GREEN ✅

Ran the existing net before building on it:

- `pnpm lint:strict` (`--max-warnings=0`) → clean
- `npx tsc --noEmit` → clean
- `pnpm test` (`vitest run`) → **20 files, 58 tests passing**
- `pnpm build` (`next build`, Turbopack) → compiled; PPR active (`◐` on `/[city]`),
  static `/`, dynamic `/api/cities*`. (jsdom logs a benign `getContext()` "not
  implemented" warning for MapLibre/Recharts canvas — expected, not a failure.)

### Test inventory (grounded in `vitest.config.ts` + file scan)

Two-project vitest config: `node` (env=node) for `lib/**`, `data/**`, `scripts/**`;
`dom` (env=jsdom, `vitest.setup.ts`) for `app/**`, `components/**`. `server-only`
shimmed via `vitest.server-only.ts`; `@/*` alias resolved natively.

- **Node / pure logic (tested):** `lib/utils`, `lib/hex/resolution`,
  `lib/hex/aggregate`, `lib/search-params`, `lib/filters/filters` (229 lines — the
  filter codec, well-pinned), `data/repository`, `data/selectors`, `data/loaders`.
- **Dom / component behavior (tested):** browse (`browse-summary`, `sort-control`,
  `listing-detail-body`, `listing-card`), `analysis/kpi-row`, `map-legend`,
  `market-header`, `city-picker`, `home-view`.
- **A11y (vitest-axe):** `market-header`, `city-picker`, `home-view`.

### Coverage gaps (factual — decisions deferred to the testing discussion)

- ⭐ **The XState machines have ZERO tests.** 5 actors — `root`, `map`, `city`,
  `ui`, `worker` (`components/scene/state/machines/*`) — plus the transition-gating
  logic from `docs/map-machine-transition-gating.md`. This is the architecture the
  portfolio is built to showcase, yet it's the least-tested part. Machines are
  unit-testable via `createActor` + `getSnapshot` with **no DOM / no WebGL**.
- **Untested pure kernels:** `lib/filters/sort.ts`, `lib/listings/compute.ts`,
  `lib/listings/worker/processes/*` (aggregate, hexes), `lib/geo/utils.ts`.
- **Out of jsdom reach (by nature):** map layers / WebGL paint, pointer/hover
  linkage, deep-link restore visuals, theme swap — currently `run-app` only.

### Open testing decisions — DO NOT decide yet; for the dedicated discussion

1. **E2E layer:** machine tests + documented `run-app` (CI-stable, no WebGL) vs.
   a minimal Playwright smoke suite vs. full Playwright. Trade-off centers on
   flaky/expensive WebGL-in-CI vs. the reviewer signal of having browser E2E.
2. **Machine-test priority:** are the XState machines + gating invariants the
   headline of the Workstream-3 backfill, or kernels first, or machines out of scope?
3. **Coverage-target stance:** we likely reject a % target on principle (goal-driven,
   not coverage-chasing) — confirm in the discussion.

### Decisions/context the user has stated (captured for permanence)

- Freeze features; all effort → polish/quality/infra/deploy/docs.
- Deploy live to **Vercel** (clickable demo URL is a goal).
- Architecture docs must **justify decisions** + lay out **future enhancements**,
  framed to show the work is **AI-assisted, not vibe-coded** (ADRs = the proof).
- **"No goalless tests"** — every test must have a specific, stated goal.
- Each workstream is its **own long, research-backed discussion**; confirm between steps.
- Clean-code **refactor depth is still OPEN** (Workstream 2).

---

## Working method

- **One workstream at a time, in order; confirm between steps.** Draft to review;
  don't wire/test unless asked (project rule in `CLAUDE.md`).
- Use **Context7 MCP** for current docs on any library/tool we touch
  (Next.js 16, Vercel, GitHub Actions, Playwright, Vitest, XState v5).
- Preserve existing conventions (conventional commits, barrel/`"use client"`
  rules, strict lint).
- This file is the durable reference — update it as each workstream resolves its
  open questions.

## Verification (per workstream, not all at once)

- Quality/refactor: `pnpm lint:strict`, typecheck, `pnpm test`, `pnpm build` all green.
- CI: a real PR shows the Actions run passing.
- Vercel: the live URL loads all 4 cities; map renders; theme + browse work.
- Docs: a cold reader can understand the project, run it locally, and find the
  decision rationale.
- Visual: `run-app` PASS report (dark/light/mobile).

## Immediate next step

Baseline is confirmed green and findings are recorded above. **Next: start a
fresh, dedicated discussion about the testing strategy** — resolve the three open
decisions before drafting `docs/testing-strategy.md` or writing any tests.
