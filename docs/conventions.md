# Conventions

This document defines contributor-facing repository rules.

Anything a tool can check is a gate, not prose. Prettier owns formatting,
TypeScript owns types, and ESLint owns import and layer boundaries. This file
explains the rules that still need human judgment and points to the enforcing
tool when one exists.

## Folder structure

Plainsight uses feature-based architecture.

```text
app/ -> features/ -> components/{ui,theme}, data, lib
data/ -> lib/
lib/ -> nothing
```

Rules:

- Product code lives in `features/<feature>/`.
- Shared UI primitives live in `components/ui/`.
- Shared theme/query/chrome components live in `components/`.
- Server data access and snapshot loading live in `data/`.
- Pure reusable logic lives in `lib/`.
- A feature must not import a sibling feature's internals.
- `data/` and `lib/` must not import `app/` or `components/`.
- `lib/` must not import runtime `data/` loaders.
- Type-only shared domain contracts may be imported where explicitly allowed.

_Enforced:_ `import/no-restricted-paths` and `no-restricted-imports` in
`eslint.config.mjs`.

## Feature internals

Decompose a feature into sub-domain folders when the domain is large enough.
For the scene feature, that means:

```text
features/scene/
  analysis/
  browse/
  map/
  shared/
  state/
```

Rules:

- Sub-domains should not import each other's internals.
- Cross-sub-domain code moves to `shared/`.
- Actor hooks and machines live under `state/`.
- Things that change together should live together.

## Barrels

Use barrels only to mark a boundary.

Allowed:

- feature root public API, for example `features/scene/index.ts`;
- cohesive subsystem public APIs, for example `features/scene/state/index.ts`;
- layer groups with a real cross-consumer API.

Avoid:

- leaf-folder barrels;
- convenience barrels that hide large dependency trees;
- barrels that mix server-only and client-safe exports.

Within a feature, prefer direct relative imports for nearby files.

## Imports and aliases

Use the `@/` alias for cross-feature and shared imports:

```ts
import { Button } from "@/components/ui/button";
import { loadCity } from "@/data";
import { applyFilters } from "@/lib/filters";
```

Within a feature, use relative imports for nearby siblings. Switch back to `@/`
when a relative path would need more than two `../` segments.

Do not use deep `../../../` chains.

_Enforced:_ `no-restricted-imports` for deep relatives and restricted paths.

## Server and client boundaries

Make the boundary visible at the file top:

- `import "server-only"` for server-only modules;
- `"use client"` for interactive components, hooks, and client actor/context code;
- `"use server"` for server actions if added later.

Rules:

- Keep Server Components as the default.
- Push client boundaries to leaf nodes where practical.
- Client-imported barrels must not re-export server-only code.
- Client modules import shared contracts, not server loader barrels.
- Browser-only MapLibre code must stay behind client boundaries.

## Naming

Rules:

- Files are kebab-case: `scene-view.tsx`, `url-write-sync.tsx`.
- Names describe domain intent, not implementation history.
- Top-level route/sub-domain compositions use the `View` suffix:
  `HomeView`, `SceneView`, `MapView`.
- Avoid vague boolean prop names whose effect is unclear at the call site.
- Keep product vocabulary stable. Prefer `lens` for Analyse/Browse mode and
  `scope` for city/neighbourhood narrowing.

## Components and styling

Rules:

- Use `components/ui/*` primitives when one exists.
- Compose primitives with props and `className`; do not fork them for feature
  styling.
- Use design tokens from `app/tokens.css`.
- Do not hard-code colors, arbitrary spacing, or ad hoc typography.
- Theme through the project theme system; do not implement feature-local theme
  switches.

_Enforced:_ Prettier for formatting through `pnpm format:check`.

## Comments

Prefer self-documenting code first: better names, stronger types, smaller
functions, and clearer boundaries.

Use comments for:

- non-obvious decisions;
- public contracts, boundaries, lifecycle rules, or invariants;
- timing, ordering, caching, concurrency, or actor coordination;
- browser, framework, accessibility, or worker limitations;
- external references that explain a constraint.

Do not use comments to:

- repeat obvious code;
- preserve implementation history;
- mention old task IDs, phase names, or component names;
- leave commented-out code;
- narrate JSX, imports, or assignments.

Use JSDoc for exported public contracts when names and types are not enough. Use
short `//` comments for local implementation notes. A stale comment is a bug.

## Tests

See [Testing strategy](testing.md) for test layers, file placement, mocking
rules, and commands.
