<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template placeholder principles -> Next.js App Router Architecture
- Template placeholder principles -> Component System Discipline
- Template placeholder principles -> Cache And State Boundaries
- Template placeholder principles -> Accessibility Is Acceptance
- Template placeholder principles -> Type Safety And Maintainability
Added sections:
- Project Rules
- Development Workflow
Removed sections:
- Unresolved template placeholder sections
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/commands/*.md (not present in this project)
Runtime guidance updates:
- ✅ docs/ui-components.md
Follow-up TODOs: None
-->

# Plainsight Constitution

## Core Principles

### I. Next.js App Router Architecture

Plainsight MUST target Next.js 16 with the App Router. Server Components are the
default rendering model, and Client Components are allowed only when browser
APIs, event handlers, client state, effects, or client-only libraries require
them. The application MUST keep static shells cacheable and isolate dynamic,
personalized, or request-time work in the smallest practical runtime boundary.

### II. Component System Discipline

All interactive React UI MUST be built from existing shadcn components in
`components/ui/*` whenever a matching primitive exists. Components MUST consume
the design tokens from `app/tokens.css` and MUST follow
`rules/react-components.md` for shadcn usage, token vocabulary, responsive
behavior, theme switching, accessibility acceptance, and prototype porting
rules. shadcn components MUST be composed through props and `className`; they
MUST NOT be forked or edited for feature-specific styling.

### III. Cache And State Boundaries

Cache Components MUST be enabled with `cacheComponents: true` before using
`use cache`. Cached functions and components MUST NOT directly read
request-time APIs such as `cookies()`, `headers()`, or `searchParams`; runtime
values must be extracted in an uncached boundary and passed as primitives into
cached work. Zustand stores MUST follow the Next.js store factory and provider
pattern so request-scoped and user-scoped state is not shared through module
globals. React Server Components MUST NOT read from or write to Zustand stores.

### IV. Accessibility Is Acceptance

Accessibility is a release criterion. New UI MUST provide keyboard access,
visible focus states, semantic names, appropriate ARIA only where needed,
working dark and light themes, `prefers-reduced-motion` support, and WCAG 2.1
AA contrast. Dialogs, drawers, sheets, menus, and popovers MUST manage focus
correctly. Dynamic result counts and meaningful async state changes MUST use
appropriate live-region behavior.

### V. Type Safety And Maintainability

TypeScript strict mode is required. New code MUST avoid `any`, unsafe casts,
and non-null assertions unless the reason is local, documented, and no practical
typed alternative exists. Domain data MUST be modeled with explicit types at
module boundaries, external input MUST be validated before trust, and nullable
states MUST remain explicit. Changes MUST stay scoped to the feature and avoid
duplicated business logic across server, client, and store layers.

## Project Rules

### Next.js App Router And Cache Components

- `next.config.*` MUST set `cacheComponents: true` when Cache Components,
  Partial Prerendering, or the `use cache` directive are used.
- Components that access uncached data, request-time APIs, or other runtime-only
  work MUST be isolated behind an explicit `<Suspense>` boundary with a useful
  fallback.
- Cached data that needs freshness controls MUST declare them near the cached
  work with `cacheLife()` and, when on-demand invalidation is required,
  `cacheTag()`.
- Mutations that affect tagged cached data MUST use the appropriate Next.js
  invalidation API, such as `revalidateTag()` or `updateTag()`.
- Broad dynamic rendering is not an acceptable workaround for cache design
  problems.

### TypeScript

- TypeScript strict mode MUST remain enabled.
- Domain state SHOULD use discriminated unions and narrow interfaces instead of
  wide optional objects when that makes UI or workflow states more explicit.
- Public module boundaries MUST avoid implicit `unknown` or unvalidated external
  data.

### Zustand

- Zustand 5 stores that can be touched during server rendering MUST be created
  per request and provided through a client provider backed by React context.
- Shared global store instances MUST NOT hold request-scoped or user-scoped
  state.
- Server-derived data MUST be passed into Client Components as props and used to
  initialize the client store.
- Store actions SHOULD be colocated with their store definition. Components
  MUST select only the state they need and avoid broad subscriptions that cause
  unrelated rerenders.

### React Components

- All new React components MUST follow `rules/react-components.md`.
- Interactive controls MUST use existing `components/ui/*` shadcn components
  whenever one exists.
- Component implementations MUST NOT hard-code raw colors, arbitrary spacing, or
  ad hoc typography.

### Clean Code And Verification

- Names MUST describe domain intent and avoid vague state names or boolean props
  whose behavior is unclear at the call site.
- Shared pure logic SHOULD be extracted only when it has a stable contract and
  reduces real duplication.
- Verification MUST cover the risky behavior introduced by a change. UI work
  MUST include keyboard and responsive checks when the touched surface is
  interactive.

## Development Workflow

Every feature plan MUST include a Constitution Check covering Next.js cache
boundaries, React component rules, Zustand store boundaries, accessibility,
TypeScript strictness, and verification. Specs MUST express user-observable
accessibility and responsive outcomes for interactive UI. Task lists MUST
include explicit implementation and verification tasks for any constitutional
rule touched by the feature.

## Governance

This constitution supersedes conflicting project guidance. Amendments require a
documented change to this file, an updated Sync Impact Report, and review of
dependent Spec Kit templates and runtime guidance. Versioning follows semantic
versioning: MAJOR for incompatible governance or principle redefinitions, MINOR
for new or materially expanded principles or sections, and PATCH for
clarifications that do not change obligations. All plans, reviews, and
implementation work MUST verify compliance with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30
