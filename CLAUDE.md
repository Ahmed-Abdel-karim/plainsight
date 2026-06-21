<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/007-browse-lens/plan.md`

<!-- SPECKIT END -->

## Active work: scene → XState v5 migration

The deep design reference is `docs/map-machine-transition-gating.md`. We work
**one step at a time, confirm between steps; draft to review, don't wire/test
unless asked.**

## Folder structure

Feature-based ("screaming") architecture. Product code lives in
`features/<feature>/`, which owns its components, hooks, utils, state, and types.
`components/` holds **only shared, cross-feature UI** (`ui/` primitives, `theme/`,
`query/`, chrome like `logo`). Layers flow downward only:
`app/ → features/ → components/{ui,theme}, data, lib`; `data → lib`;
`lib → domain-kernel` only. The **domain kernel** is the type-only shared
vocabulary in `data/contract.ts` + `data/types.ts` (shapes and pure policy
constants); it sits logically below `lib`, and the `data/` prefix is storage
co-location, not an IO edge. `lib` must not touch `data/` **runtime**
(loaders/repository/selectors). **A feature never imports another feature.**

- **Decompose a feature into sub-domain folders** (`scene/{map,browse,analysis}`),
  plus `scene/state/` for the actor system and `scene/shared/` for cross-sub-domain
  hooks/utils/constants. **No sub-domain imports another sub-domain's internals** —
  shared code goes to `shared/` (or `state/` for actor hooks).
- **Barrels are public API only.** One `index.ts` at each **feature root** (its
  external surface) and at **cohesive subsystems with a real cross-consumer API**
  (`scene/state`, `scene/map/layers` + each layer, `scene/{analysis,browse,map}`).
  **No barrels on leaf folders.** Within a feature, import modules **directly**
  (relative or `@/`), never through a re-export barrel — barrels cost tree-shaking,
  so they earn their place only by marking a boundary.
- **Server/client never share a barrel.** A barrel a client module imports must
  not re-export server-only code (`server-only`/`"use cache"` loaders, server
  components) into the client graph. Client-safe types stay importable without
  pulling server code — client modules import `@/data/contract`, not the `@/data`
  barrel.
- **Imports / aliases.** Cross-feature & shared → absolute `@/…`
  (`@/components/ui/button`, `@/data`, `@/lib/filters`, `@/features/scene`).
  Within a feature → relative for near siblings; switch to absolute
  `@/features/<f>/…` once a relative path would need **more than two `../`**. No
  `../../../` chains.
- **Co-locate a sub-component in its parent's file** (a component used only by one
  parent), **unless it sits on the other side of the `"use client"` boundary** —
  then it's a separate file in the same folder. A `"use client"` directive applies
  to the whole module, so a client wrapper around a server component (e.g.
  `city-switcher/city-link.tsx` beside the server `city-switcher.tsx`) must be its
  own file. See `city-switcher/` for the canonical shape.
- **Single-file leaf components don't get a folder.** A lone file imported
  directly is already unified; wrapping it in a folder + barrel is pure churn.
- **Skeletons colocate in the component's file; routes compose, don't fetch.**
  Push `"use client"` to leaf nodes; pages compose components behind Suspense.

## Comments

Self-documenting code first — reach for a better name, a type, or a smaller
function before a comment. Comments are review-enforced judgment, not a mechanical
gate.

- **Descriptive JSDoc on exported / public API is welcome** — functions, their
  params, and interfaces, **where the name alone isn't enough** (e.g. the
  `lib/filters` helpers). Keep it **as brief as it can be**; a single line is ideal,
  but 2–3 lines + `@param` is fine when the contract genuinely needs it.
- **Inline comments are for the non-obvious _why_** — a workaround, a deferral to
  another layer, a subtle ordering/timing reason. **When unsure whether a "why" is
  obvious, keep it** — a missing rationale costs more than a slightly redundant one.
- **A rare _what_ comment is allowed for genuinely dense code** — a gnarly regex,
  bitwise trick, or algorithm whose intent can't be read off the code.
- **Keep comments in sync with the code.** A stale or wrong comment is worse than
  none — update or delete it in the same change.
- **No process artifacts in code.** No principle / story / task numbers, phase
  names, or pointers to since-deleted code. A comment explains the code as it
  stands, not the history that produced it.
- **Delete noise** — comments that narrate what the code plainly does, label
  obvious structure (`// arrange` / `// act`), or read like a conversation. A
  comment that duplicates a name adds nothing.
