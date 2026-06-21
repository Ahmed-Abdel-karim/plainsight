# Conventions

How we work in this repo. These are the canonical rules; the agent file
(`AGENTS.md`) and tooling reference this document rather than restating it.

**What's enforced vs. documented.** Anything a machine can check is a gate, not
prose: Prettier owns formatting, TypeScript owns types, and ESLint owns the
import/layer boundaries (all re-run in CI). This file documents the rules that
need human judgment, and points at the gate where one exists ("_Enforced:_ …").
If a rule is enforced, the gate is the source of truth — fix the code, not the
doc.

## Folder structure

Feature-based ("screaming") architecture. Product code lives in
`features/<feature>/`, which owns its components, hooks, utils, state, and types.
`components/` holds only shared, cross-feature UI (`ui/` shadcn primitives,
`theme/`, `query/`, chrome like `logo`).

Layers flow downward only — a layer imports below it, never above:

    app/ → features/ → components/{ui,theme}, data, lib
    data/ → lib/
    lib/ → (nothing)

A feature never imports a sibling feature. `data/`/`lib/` never import
`components/`/`app/`; `lib/` never imports `data/` runtime (the type-only
`data/contract` + `data/types` are the shared domain vocabulary and are allowed).

_Enforced:_ `import/no-restricted-paths` in `eslint.config.mjs`.

## Feature internals

Decompose a feature into sub-domain folders (`scene/{map,browse,analysis}`), with
`scene/state/` for the XState actor system and `scene/shared/` for cross-sub-domain
hooks/utils/constants. No sub-domain imports another's internals — shared code
goes to `shared/` (or `state/` for actor hooks). _Why:_ things that change
together live together; a sideways dependency between sub-domains is a sign the
shared piece wants to move down to `shared/`.

## Barrels — public API only

One `index.ts` at each feature root (its external surface) and at cohesive
subsystems with a real cross-consumer API (`scene/state`, `scene/map/layers` +
each layer). No barrels on leaf folders. Within a feature, import modules
directly. _Why:_ re-export barrels defeat tree-shaking, so a barrel earns its
place only by marking a boundary — not as a convenience index.

## Imports & aliases

Cross-feature and shared imports use the absolute `@/…` alias
(`@/components/ui/button`, `@/data`, `@/lib/filters`, `@/features/scene`). Within
a feature, use relative paths for near siblings; switch to `@/features/<f>/…`
once a relative path would need more than two `../`. No `../../../` chains.

_Enforced:_ `no-restricted-imports` (deep relatives) + `import/no-restricted-paths`
(layer/feature boundaries) in `eslint.config.mjs`.

## Server / client boundaries

Declare the boundary per file, at the top: `import "server-only"` on server
modules, `"use server"` on mutations, `"use client"` on stores/hooks/interactive
components. Keep Server Components the default and push `"use client"` to leaf
nodes. A barrel a client module imports must not re-export server-only code —
client modules import `@/data/contract`, not the `@/data` loaders barrel. _Why:_
the server/client cut should be legible without tracing the import graph, and a
mixed barrel drags server-only code into the client bundle.

## Naming

Files are kebab-case, including components (`scene-view.tsx`, `use-lens.ts`).
Names describe domain intent, not placement or implementation history — no
`Sidebar*` for content that also renders in a drawer, no vague boolean props
whose effect is unclear at the call site.

Top-level view components — the composed components a route mounts for a feature
or sub-domain — carry the `View` suffix and are named for their domain
(`HomeView`, `SceneView`, `MapView`). Do not use ad-hoc synonyms (`-scene`,
`-screen`, `-page`, `-container`) for this role.

> Product-term vocabulary (`lens` vs `mode`, British `Analyse`, the panel noun)
> is still being settled; the specific terms land here once they do.

## Components & styling

Formatting and code style are owned by Prettier — this doc never restates style
rules. Beyond that: use `components/ui/*` shadcn primitives whenever one exists,
and compose them through props and `className` — never fork a primitive for
feature styling. Consume design tokens from `app/tokens.css`; no hard-coded
colors, arbitrary spacing, or ad hoc typography. Theme via next-themes (dark
default, in-place light swap).

_Enforced:_ Prettier (`pnpm format:check`) for formatting.

## Comments

Prefer self-documenting code first: better names, clearer types, smaller
functions, and stronger boundaries should come before comments.

Use comments when they explain information the code cannot express clearly:

- why a non-obvious decision exists
- a public contract, boundary, lifecycle, or invariant
- timing, ordering, caching, concurrency, or actor coordination
- framework-specific tradeoffs, browser limitations, accessibility rationale, or
  worker behavior
- an external reference the code depends on

Do not use comments to:

- repeat what the code already says
- preserve implementation history
- mention feature IDs, task IDs, phase names, or old component names
- describe previous versions of the code
- leave commented-out code
- narrate obvious JSX, assignments, or imports

Use `/** ... */` JSDoc for exported public contracts when the name and type are
not enough. Use `//` for local implementation notes. Keep both short.

When code changes, update or delete nearby comments in the same change. A stale
comment is a bug.

## Testing

See `testing.md` for the test layers, file placement, mocking rules, and
commands.
