# Implementation Plan: City Establishes the Default Analysis Scope

**Branch**: `002-city-default-scope` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-city-default-scope/spec.md`

## Summary

Turn the placeholder `/[city]` page into the city-scoped scene shell. The server-rendered city page loads the city dataset by slug, sets the active analysis scope to `{ type: "city" }`, derives the city-scope aggregates, and renders a scene composed of a map region and a sidebar region. A scope label inside the scene shows the city name and the city's total listing count, formatted with digit grouping, using polite live-region semantics so the later scope-label story (E1-S3) and scope narrowing can build on it. Unknown slugs call `notFound()` and render a graceful, segment-scoped `not-found.tsx` view with a keyboard-accessible "back to the city picker" action — no crash, no blank map. The interactive priced-pin map and analytics charts remain deferred to later epics (E4–E7); this story delivers the city-scoped shell those epics populate.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 App Router

**Primary Dependencies**: Next.js `Link` + `notFound()`, shadcn `Button` (Server Component, used `asChild` with `Link`) and `Skeleton`, existing data layer (`getCityDataset`, `selectScopeAggregates`, `Scope` type), Tailwind CSS 4 token utilities

**Storage**: Static JSON in `data/json` — per-city datasets (`${slug}.json`) loaded via the cached `getCityDataset()` loader; `cities.json` index defines the supported set

**Testing**: `pnpm format:check`, `pnpm lint:strict`, `pnpm build`, plus manual browser + keyboard acceptance checks

**Target Platform**: Web application served by Next.js

**Project Type**: Single Next.js application

**Performance Goals**: City scene renders from cached static data with no user configuration; scope and label derive once per request on the server

**Constraints**: Follow `rules/react-components.md` (shadcn composition + tokens), preserve `cacheComponents: true`, derive scope from the URL slug (reload-safe/shareable), keep the supported-city set data-backed, and meet WCAG 2.1 AA keyboard/focus/contrast for the back-to-picker action

**Scale/Scope**: One dynamic route (`app/[city]`) updated, one new `not-found.tsx`, a small `components/scene/*` shell (scene + map region + sidebar region + scope label); four supported launch cities

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Next.js App Router**: PASS. `app/[city]/page.tsx` and `app/[city]/not-found.tsx` are async/Server Components. No Client Component is required: the back-to-picker action is shadcn `Button` (no `"use client"`) composed `asChild` with Next `Link`, and the scope label's live-region is markup-only.
- **Cache Components**: PASS. The city page is cacheable (`"use cache"`), generates known params via `generateStaticParams`, awaits the `params` Promise, and reads no request-time APIs. `getCityDataset()` already declares `"use cache"` + `cacheLife("max")`. Unknown slugs use `notFound()` (the pattern established in 001, compatible with Cache Components).
- **Zustand**: PASS. No store is introduced. Scope is `{ type: "city" }` derived from the URL slug on the server and passed as props; client narrowing state (neighbourhood selection) is deferred to a later story.
- **React Components**: PASS. The scene shell composes shadcn `Button` and `Skeleton` and token utilities; the prototype `scene.css`/`app.jsx` scope-label is a visual reference only and is not copied. No shadcn component is edited or forked.
- **Accessibility**: PASS. The back-to-picker action is a real link/button with visible focus and Enter activation; the scope label uses `role="status"`/`aria-live="polite"` and conveys the count as understandable text; scene shell and not-found view are responsive and theme-safe with reduced-motion-friendly transitions.
- **Type Safety And Verification**: PASS. Reuses `CityDataset`, `ScopeAggregates`, and `Scope` types and `selectScopeAggregates`; no `any`/unsafe casts. Verification covers the risky behavior: city-scope rendering, the data-backed scope label, and the unknown-slug not-found path with keyboard checks.

## Project Structure

### Documentation (this feature)

```text
specs/002-city-default-scope/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
app/
└── [city]/
    ├── page.tsx          # UPDATED — load dataset; notFound() on miss; set city scope;
    │                     #   derive city-scope aggregates; render <CityScene>
    └── not-found.tsx     # NEW — graceful not-found view + back-to-picker action

components/
└── scene/
    ├── city-scene.tsx    # NEW (Server) — scene shell: composes map + sidebar regions, takes city + scope props
    ├── map-region.tsx    # NEW (Server) — placeholder map region shell (Skeleton); interactive map deferred to E4/E5
    ├── sidebar-region.tsx# NEW (Server) — sidebar shell hosting the scope label + deferred analytics slots
    └── scope-label.tsx   # NEW (Server) — city name · total listing count, polite live-region (baseline for E1-S3)

data/
├── loaders.ts            # getCityDataset() (existing, cached)
├── selectors.ts          # selectScopeAggregates(dataset, scope) (existing) → city aggregates for the label count
└── types.ts              # Scope (existing): { type: "city" } | { type: "neighbourhood"; id: string }
```

**Structure Decision**: Update `app/[city]/page.tsx` to resolve the dataset, branch to `notFound()` for unknown slugs, set the default scope `{ type: "city" }`, derive the scope aggregates with `selectScopeAggregates`, and render `components/scene/city-scene.tsx`. The scene composes `map-region.tsx` (a non-interactive placeholder shell so the real map can slot in at E4/E5) and `sidebar-region.tsx`, which hosts `scope-label.tsx`. Add `app/[city]/not-found.tsx` so an unknown slug renders a graceful, segment-scoped view with a shadcn `Button` (`asChild` + `Link`) back to `/`. All new components are Server Components; no Zustand store or map library is introduced in this story.

## Phase 0: Research

See [research.md](./research.md). All design questions are resolved with no remaining clarifications.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Next.js App Router**: PASS. Dynamic route follows the Next.js 16 params-as-Promise convention, generates known params, and renders a segment-scoped `not-found.tsx` for unknown slugs.
- **Cache Components**: PASS. The page reads only cached static data; no request-time APIs are introduced.
- **Zustand**: PASS. No store added; scope is URL-derived server state passed as props.
- **React Components**: PASS. The scene shell and not-found view compose shadcn `Button`/`Skeleton` with token utilities; no component is forked.
- **Accessibility**: PASS. The UI contract requires keyboard-reachable back-to-picker with visible focus, polite live-region scope label, responsive regions, and theme/contrast compliance.
- **Type Safety And Verification**: PASS. The data model reuses typed dataset/scope shapes and defines verification commands and manual keyboard checks.

## Complexity Tracking

No constitutional violations or complexity exceptions are required.
