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
