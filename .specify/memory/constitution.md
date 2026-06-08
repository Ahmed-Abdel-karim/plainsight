<!--
Sync Impact Report
Version change: 1.5.0 -> 1.6.0
Modified principles: Project Rules -> Zustand (redefined store organization for the
  single composite slice store: per-slice file layout, namespaced action factories,
  atomic selectors + combineSelectors, within-slice vs cross-slice subscriptions,
  StoreState composition / cycle-avoidance). The prior multi-store rules (selectors in
  the store file; cross-store selectors in stores/index.ts) are superseded. The
  proxy-memoize rule was dropped pending introduction of memoized selectors.
Removed or renamed principles: None
Added sections: None
Removed sections: None
Templates requiring updates:
- ✅ updated: .specify/templates/plan-template.md (Constitution Check Zustand bullet now
  cites slice composition, selectors/subscriptions organization)
Runtime guidance updates: None
Follow-up TODOs:
- Re-add the proxy-memoize selector rule once memoized selectors are introduced.
Version bump rationale: MINOR — materially redefines the internal rules of one Project
  Rule (Zustand) to match the implemented slice architecture; no Core Principle or
  governance clause is removed, consistent with the prior 1.4.0 -> 1.5.0 Zustand bump.

Prior amendment (1.4.0 -> 1.5.0)
Modified principles: Project Rules -> Zustand (store side-effects, selectors, cross-store index, proxy-memoize)
Removed or renamed principles: None
Added sections: None
Removed sections: None
Templates requiring updates: None
Runtime guidance updates: None
Follow-up TODOs: None

Prior amendment (1.3.0 -> 1.4.0)
Modified principles: Project Rules -> Map Layer Modules
Removed or renamed principles: None
Added sections: None
Removed sections: None
Templates requiring updates:
- ⚠ pending: .specify/templates/plan-template.md (constitution-only change requested)
Runtime guidance updates: None
Follow-up TODOs:
- Existing map-layer migration is now aligned to the constitution update.

Prior amendment (1.2.0 -> 1.3.0):
- Added Project Rules -> Map Layer Modules.
- ⚠ pending: .specify/templates/plan-template.md (Constitution Check should cite the map-layer contract)

Prior amendment (1.1.0 -> 1.2.0):
- Added Core Principles -> VI. Layered Feature Architecture.
- Added Project Rules -> Module Boundaries.
- Added docs/architecture.md (target tree + rationale).
- ⚠ pending: .specify/templates/plan-template.md (Constitution Check should cite module boundaries / layer dependency direction)

Prior amendment (1.0.0 -> 1.1.0):
- Added Project Rules -> Testing Layers.
- ⚠ pending: .specify/templates/plan-template.md (Constitution Check should cite the testing-layer split)

Prior amendment (template -> 1.0.0):
- Established the five core principles, Project Rules, and Development Workflow.
- Synced plan/spec/tasks templates and docs/ui-components.md.
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

### VI. Layered Feature Architecture

The codebase is organized in four layers with dependencies pointing downward
only: `app/` (routes that compose features and own Suspense boundaries, no
business logic), `components/` (UI — feature folders plus shared `ui/`, `theme/`,
and chrome), `data/` (the IO seam: ports and adapters, entered only through the
`@/data` loaders barrel), and `lib/` (the pure, framework-light shared kernel).
A layer MUST NOT import from a layer above it, and a feature MUST NOT import a
sibling feature. Feature-specific code (components, hooks, state, view-models)
MUST live with its feature; code in shared locations MUST have more than one
consumer. The full target tree, dependency rules, and the rationale for deferring
a top-level `features/` directory live in `docs/architecture.md`, which all new
code MUST follow.

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
- Related state MUST be organized as one composite store built from slices.
  Each slice MUST live in `components/scene/stores/slices/<slice>/` and own a
  fixed file layout: `state.ts` (state shape plus `initial<Slice>State`),
  `actions.ts` (a `create<Slice>Actions(set, get)` factory), `selectors.ts`
  (atomic selectors), `hooks.ts` (named selector hooks), `slice.ts`
  (a `create<Slice>Slice` `StateCreator` composing state and actions),
  `index.ts` (the slice barrel — its public API), and `types.ts` (slice domain
  types). A slice with reactive side effects MUST also contain
  `subscriptions.ts`.
- The store MUST be created once in `stores/store.ts` by spreading the slice
  creators into `create()(subscribeWithSelector(...))`. `store.ts` MUST import
  slice CREATORS by sub-path (`./slices/<slice>/slice`) and MUST NOT import the
  slice barrel, so the barrel's hooks (which import the store) cannot form an
  import cycle.
- Slice actions MUST be produced by the `create<Slice>Actions(set, get)`
  factory and exposed under a single namespaced key (`<slice>Actions`) on the
  slice. Components MUST select only the state they need through named hooks and
  MUST avoid broad subscriptions that cause unrelated rerenders.
- Each slice MUST expose its field reads as a `<slice>Selectors` object of
  atomic selectors typed over the composite `StoreState` in `selectors.ts`.
  Named hooks in `hooks.ts` MUST wrap those selectors (with `useShallow` or
  plain equality) and MUST include any formatting, defaulting, or conditional
  derivation consumers need. Components MUST use the hooks and MUST NOT apply
  inline field reads or formatting on top of raw store state.
- Multi-field reads shared between hooks and subscriptions MUST be assembled
  with `combineSelectors` over the canonical atomic selectors, so hooks
  (via `useShallow`) and subscriptions (via `{ equalityFn: shallow }`) share one
  definition. Re-declaring inline composite field reads is prohibited.
- Non-React side effects that react to state changes (imperative map API calls,
  URL projection, worker sync, view transitions) MUST be implemented as store
  subscriptions via `subscribeWithSelector`, not as component `useEffect`. UI
  components are pure state pushers — they call actions; the store reacts out.
  Within-slice subscriptions MUST live in that slice's `subscriptions.ts`
  (`register<Slice>Subscriptions`); subscriptions spanning two or more slices
  MUST live in `stores/subscriptions.ts`. All subscriptions MUST be registered
  centrally from `store.ts`, MUST guard on all required conditions (e.g.
  `mapStatus === 'ready'`) so update ordering is irrelevant, and where
  registration order is load-bearing it MUST be documented at the call site.
- The composite `StoreState` MUST be defined in `stores/slices/index.ts` as an
  interface that extends every slice type (interface, not type alias, so the
  cross-module circular type resolves lazily). Cross-slice store plumbing types
  (`SetFn`, `GetFn`, `Subscriber`) MUST live in `stores/slices/types.ts`;
  slice-specific domain types stay with their slice.

### React Components

- All new React components MUST follow `rules/react-components.md`.
- Interactive controls MUST use existing `components/ui/*` shadcn components
  whenever one exists.
- Component implementations MUST NOT hard-code raw colors, arbitrary spacing, or
  ad hoc typography.

### Module Boundaries

- All new code MUST follow `docs/architecture.md` (the four-layer model and
  target tree).
- Layer dependencies point downward only: `app/` → `components/` → `data/`,
  `lib/`. `data/` and `lib/` MUST NOT import from `components/` or `app/`, and
  `lib/` MUST NOT import from `data/`.
- UI MUST reach data only through the `@/data` loaders barrel. Nothing outside
  `data/` MAY import `data/repository/*`; the adapter swap is wired in exactly
  one place (`data/repository/index.ts`).
- `lib/` MUST stay pure and framework-light with no feature knowledge; a React
  hook, store, or component MUST live with its feature, not in `lib/`.
- Feature-specific modules MUST live inside their feature folder. A module MAY
  move to a shared location (`components/ui`, `components/theme`, shared chrome)
  only when a second consumer exists.
- A top-level `features/` directory MUST NOT be introduced until a genuinely
  independent second domain exists (see the rationale in `docs/architecture.md`).

### Clean Code And Verification

- Names MUST describe domain intent and avoid vague state names or boolean props
  whose behavior is unclear at the call site.
- Shared pure logic SHOULD be extracted only when it has a stable contract and
  reduces real duplication.
- Verification MUST cover the risky behavior introduced by a change. UI work
  MUST include keyboard and responsive checks when the touched surface is
  interactive.

### Testing Layers

- Server Components that fetch data MUST delegate rendering to a synchronous
  presentational component receiving plain serializable props (objects/arrays,
  never promises). Data fetching, `await`, and `notFound()` stay in the async
  route/loader boundary.
- "The correct data is rendered" is split into two layers: data **selection**
  (pure selectors, e.g. `selectScopeAggregates`) is unit-tested, and data
  **display** (presentational components) is integration-tested by rendering
  the component with fixtures. Neither layer mocks the data loaders.
- Async route/loader boundaries, navigation, redirects, and `notFound()`
  triggering are covered by E2E, not by unit/integration tests. Async Server
  Components MUST NOT be unit-tested by awaiting and rendering their output
  (the Next.js + Vitest unsupported pattern).
- Component queries MUST be accessibility-first (role/name) to keep the
  Accessibility principle enforceable through tests.

### Map Layer Modules

- Every map-layer folder at `components/scene/map/<layer>/` MUST contain a
  `styles.ts` module for MapLibre layer specifications, paint and layout styles,
  theme mappings, and style expressions.
- Every map-layer folder at `components/scene/map/<layer>/` MUST expose its
  folder interface through `index.ts`, and external consumers SHOULD import the
  layer domain from that entrypoint rather than reaching into implementation
  files.
- Every map-layer folder may keep its component filename as
  `<layer>-layers.tsx` for source and layer composition, but the folder
  interface MUST remain `index.ts`.
- Every interactive map-layer folder MUST contain `listeners.ts`.
- Each map-layer `listeners.ts` MUST export a layer-specific React hook that
  internally registers listeners through `useLayerListeners`.
- Each interactive map-layer component MUST call its layer-specific listener
  hook and MUST NOT define or register layer listeners inline.
- A display-only map layer with no registered interactions MUST NOT be required
  to contain `listeners.ts`.

## Development Workflow

Every feature plan MUST include a Constitution Check covering Next.js cache
boundaries, React component rules, Zustand store boundaries, accessibility,
TypeScript strictness, and verification. Specs MUST express user-observable
accessibility and responsive outcomes for interactive UI. Task lists MUST
include explicit implementation and verification tasks for any constitutional
rule touched by the feature. Map-layer changes MUST verify compliance with the
Map Layer Modules contract.

## Governance

This constitution supersedes conflicting project guidance. Amendments require a
documented change to this file, an updated Sync Impact Report, and review of
dependent Spec Kit templates and runtime guidance. Versioning follows semantic
versioning: MAJOR for incompatible governance or principle redefinitions, MINOR
for new or materially expanded principles or sections, and PATCH for
clarifications that do not change obligations. All plans, reviews, and
implementation work MUST verify compliance with this constitution.

**Version**: 1.6.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-06-08
