# Implementation Plan: Curated City Picker

**Branch**: `001-curated-city-picker` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-curated-city-picker/spec.md`

## Summary

Replace the placeholder landing route with a data-backed city picker. The server-rendered `/` page renders an async Server Component (`city-picker.tsx`) that loads the curated launch set from `data/json/cities.json` and renders selectable cards. Each card's link is a narrow Client Component (`card-link.tsx`) that adds keyboard Space activation. Cards navigate to the root-level city slug route such as `/london`.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.4, Next.js 16.2.6 App Router

**Primary Dependencies**: Next.js `Link`, shadcn `Card`, existing data loaders from `data/`, Tailwind CSS 4 token utilities

**Storage**: Static JSON files in `data/json`, with `cities.json` as the launch-city index

**Testing**: `pnpm format:check`, `pnpm lint:strict`, `pnpm build`, manual browser and keyboard checks

**Target Platform**: Web application served by Next.js

**Project Type**: Single Next.js application

**Performance Goals**: Landing city picker renders without user configuration and uses cached server data for the static launch set

**Constraints**: Must follow `rules/react-components.md`, use shadcn composition and design tokens, preserve `cacheComponents: true`, avoid hard-coded duplicate city lists, and support keyboard Enter/Space activation

**Scale/Scope**: One landing route, four current launch cities from data, one minimal city route shell for slug navigation validation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Next.js App Router**: PASS. `/` renders an async Server Component (`city-picker.tsx`) for data loading. A narrow Client Component (`card-link.tsx`) is justified only for Space-key card activation.
- **Cache Components**: PASS. The landing route is cached at the page level (`app/page.tsx` declares `"use cache"`) and reads static filesystem data, not request-time APIs. The per-city dataset loader `getCityDataset()` additionally uses `"use cache"` with `cacheLife("max")`.
- **Zustand**: PASS. This feature does not introduce request-scoped or user-scoped client store state.
- **React Components**: PASS. City cards will compose shadcn `Card` components, consume token utilities, and follow `rules/react-components.md`; prototype code is a visual reference only.
- **Accessibility**: PASS. The plan includes focusable cards, visible focus states, semantic link text, Enter/Space activation, responsive layout, and reduced-motion-safe transitions.
- **Type Safety And Verification**: PASS. Existing `CityData` types will be reused; verification includes formatting, strict linting, build, and keyboard checks.

## Project Structure

### Documentation (this feature)

```text
specs/001-curated-city-picker/
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
├── page.tsx
└── [city]/
    └── page.tsx

components/
└── city-picker/
    ├── city-picker.tsx   # async Server Component — loads data, renders cards
    ├── city-card.tsx     # Server Component — single card markup + image
    ├── card-link.tsx     # "use client" — Link + Space-key activation + accessible name
    └── city-images.ts    # slug → static image asset map

data/
├── json/cities.json
├── loaders.ts
└── types.ts
```

**Structure Decision**: Implement the landing page in `app/page.tsx`, load and render the launch set in the async Server Component `components/city-picker/city-picker.tsx` (composing `city-card.tsx`), isolate the Space-key interaction in the Client Component `components/city-picker/card-link.tsx`, and add `app/[city]/page.tsx` so data-backed slug navigation has a valid route target during acceptance testing.

## Phase 0: Research

See [research.md](./research.md). All design questions are resolved with no remaining clarifications.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Next.js App Router**: PASS. Dynamic city route follows Next.js 16 App Router params-as-Promise convention, generates known launch-city params, and handles unknown slugs with `notFound()`.
- **Cache Components**: PASS. The landing route uses cached static launch data and introduces no request-time API reads.
- **Zustand**: PASS. No Zustand store is introduced.
- **React Components**: PASS. The selected component design uses shadcn Card composition and token classes; no shadcn component is edited or forked.
- **Accessibility**: PASS. The UI contract requires keyboard tab order, Enter/Space activation, visible focus, responsive card layout, and descriptive accessible names.
- **Type Safety And Verification**: PASS. The data model reuses typed city shapes and defines verification commands and manual checks.

## Complexity Tracking

No constitutional violations or complexity exceptions are required.
