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

A feature lives in one folder with a single `index.ts` **barrel**, which is its
only public API. Import features through the barrel (`./city-switcher`), never via
a deep path (`./city-switcher/city-switcher`).

- **The barrel exports components only.** Keep it minimal — surface the public
  entry component(s) and nothing else, so internal sub-components stay private.
- **Utils and hooks keep direct imports** (`./analysis/format`,
  `./browse/use-browse-points`) — they are not re-exported from the barrel. This
  is the practical form of the `"use client"` rule below: client modules import
  these directly, so routing them through a barrel that also re-exports server
  components could drag server-only code into the client graph.
- **Co-locate a sub-component in its parent's file** (a component used only by one
  parent), **unless it sits on the other side of the `"use client"` boundary** —
  then it's a separate file in the same folder, behind the same barrel. A
  `"use client"` directive applies to the whole module, so a client wrapper around
  a server component (e.g. `city-switcher/city-link.tsx` beside the server
  `city-switcher.tsx`) must be its own file. See `lens-tabs/` for the canonical
  shape.
- **Single-file leaf components don't get a folder.** A lone file imported
  directly is already unified; wrapping it in a folder + barrel is pure churn.
