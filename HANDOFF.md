# Plainsight — Polishing & Docs-Consolidation Handoff

> Resumable state for the portfolio-polishing effort (as of 2026-06-19). Read this
> to continue without re-deriving context. Working doc, like `ARCH_FINDINGS.md`.

## Goal

Finalize Plainsight as a senior Next.js/React portfolio. Two intertwined threads:

1. **Architecture polish** — feature-based refactor + machine-enforced boundaries.
2. **Docs consolidation** — `_docs/` becomes the **single source of truth**;
   retire SpecKit (`.specify/`), the old `docs/` tree, and `specs/` at the end.

## Governance model (the spine) — 4 tiers

1. **Automated gates** (most authoritative; "enforce, don't document"): Prettier =
   style, ESLint = structure boundaries, tsc = types, vitest/playwright = tests,
   commitlint = commits.
2. **Human docs** — general rules + rationale (`_docs/conventions.md`,
   `architecture.md`, `project-boundaries.md`).
3. **Agent instructions** — strict, imperative, <300 lines, references the human
   docs (never duplicates), AI-gotchas (`AGENTS.md`, imported by `CLAUDE.md`).
4. **ADRs** — decisions + why; human-first, AI-referenced (`_docs/decisions/`).

Anti-drift: one canonical rule lives once (human doc); `AGENTS.md` is a strict
imperative _projection_ + pointer, not a copy. Local hooks = fast feedback; **CI =
final authority** (re-runs everything except commitlint; **e2e CI-only**).

## Done (this effort)

- **Feature-based refactor.** `components/scene` → `features/scene`;
  `components/{home,city-picker}` → `features/home`; `components/` now shared-only
  (`ui/`, `theme/`, `query/`, `logo`, `utils/`). New `scene/shared/` (use-lens,
  use-scope, use-city-boundaries, room-display, format) killed the
  `browse → analysis/format` sideways dep. Public-API-only barrels; feature-root
  barrels (`features/scene/index.ts`, `features/home/index.ts`) with `app/` routed
  through them. `@/` aliases, no `../../../`. tsc/lint/test/build green + run-app
  visual verified.
- **Enforcement (Workstream E).** ESLint `import/no-restricted-paths` (downward-only
  layers + no sibling-feature; `lib` may import only the type-only
  `data/contract`+`data/types` via `except`) and `no-restricted-imports` (ban
  `../../../`) — verified firing on planted violations. `lint-staged` (staged-only
  pre-commit, replacing the slow repo-wide hook); new `pre-push` =
  lint:strict+tsc+test; `.github/workflows/ci.yml` (format/lint/tsc/test/build);
  `e2e.yml` left separate (CI-only).
- **`_docs/conventions.md` drafted** — lean, with "_Enforced: …_" pointers; the
  Comments section kept verbatim as its single home.
- **A0 banners** — "⚠ SUPERSEDED" on `.specify/memory/constitution.md` and
  `docs/architecture.md`.
- **Removed dead deps** `zustand` + `proxy-memoize` (verified unused; build green).
- `CLAUDE.md` Folder-structure section rewritten (the canonical seed for
  `conventions.md`).

## ADRs — agreed approach (researched)

- **Threshold** (real practice — Nygard / ThoughtWorks / adr.github.io / Backstage):
  write an ADR when a decision is significant + costly-to-reverse + has real
  alternatives + supersedes a prior decision + invites "why is it this way?". NOT
  for routine/local/obvious choices. Lightweight (~1–2 pages),
  Context→Decision→Consequences, **immutable once accepted**, why-focused; record
  rejected alternatives only when they were genuine contenders.
- **Folder nuance:** the _decision_ to go feature-based is an ADR (it superseded the
  constitution's "defer `features/`"); the folder _layout_ is docs only.
- **Agreed list (7):**
  - `0001` Feature-based architecture (barrels + `@/` aliases folded in; 3 real
    alternatives: restructure-in-place / colocate-in-`app/` / adopt `src/`).
  - `0002` XState actor model over Zustand.
  - `0003` Immutable, versioned city snapshots in external object storage; no
    database or persistent application backend in the read-only first version.
  - `0004` Tiered snapshot delivery: materialized server summaries for a useful
    initial Analyse view + complete client detail for map/browse/filtering.
  - `0005` Off-main-thread analytical compute via Web Worker.
  - `0006` Persistent MapLibre WebGL map in the `(scene)` route-group layout.
  - `0007` next-themes (client) over server-cookie theming (cacheComponents incompat).
- Also write the explicit "when is an ADR required" trigger into
  `_docs/decisions/README.md`.
- **Status:** `0001`–`0003` drafted; continue one-by-one from `0004`. External
  object-storage delivery from `0003` is implemented during the deployment
  workstream before the portfolio is finalized.

## Remaining work

- Draft ADRs `0004`–`0007` one at a time (in discussion).
- Fill `_docs/architecture.md` — feature-based model, data seam + repository swap,
  XState actor system (root/map/city/ui/worker), map lifecycle, Mermaid C4 + state
  diagrams. Harvest from `docs/architecture.md` + `docs/map-machine-transition-gating.md`;
  reconcile Zustand→XState, `components/scene`→`features/scene`.
- Fill `_docs/project-boundaries.md` — FR/NFR, browser support, Vercel-free-tier /
  static / no-backend cost boundaries, assumptions, **explicit non-goals**.
- Reconcile `_docs/testing.md` against `docs/testing-strategy.md` (710 lines), then
  supersede.
- `_docs/AGENTS.md` + `CLAUDE.md` as thin routers (strict projection; strip
  duplicated rule bodies).
- **Workstream C (LAST, destructive, end of polishing):** promote `_docs/`→`docs/`
  (keep `map-machine-transition-gating.md` as a linked deep-dive); remove
  `.specify/` after harvesting live principles; retire `specs/` after lifting true
  FRs into `project-boundaries.md`; flag the now-purposeless `speckit-*` skills.

## Outstanding naming questions (from `ARCH_FINDINGS.md` — gate naming-dependent docs)

`SceneUrlLoader` / `UrlWriteSync` / `LensActivity` renames; `lens` vs `mode`/`view`;
British `Analyse` in code vs UI; primary panel noun (market / scene / explorer).

## Working style (honor these)

- One explicit step at a time; confirm between steps; draft-to-review; no
  wiring/tests/extras unless asked.
- Open design talk: prose with tiny concrete examples, one point at a time. The
  user dislikes AskUserQuestion chips for clarification — discuss in prose.
- Commit later (don't commit unless asked). Current branch: `007-browse-lens`.

## Key files

- This handoff (working state).
- `_docs/`: `README.md`, `conventions.md` (drafted), `architecture.md` /
  `project-boundaries.md` / `testing.md` (placeholders/partial),
  `decisions/{README,0000-template}.md`.
- `CLAUDE.md` (active; Folder-structure rewritten), `ARCH_FINDINGS.md` (audit log).
- `eslint.config.mjs` (boundary rules), `.husky/{pre-commit,pre-push,commit-msg}`,
  `.lintstagedrc.json`, `.github/workflows/{ci,e2e}.yml`.
- Superseded (banners added, retire in Workstream C): `.specify/memory/constitution.md`,
  `docs/architecture.md`, `docs/testing-strategy.md`.

## Next action

Draft **ADR 0004** (materialized server summaries + complete client detail), then
continue through 0007 one at a time, using the question-by-question discussion
method established for ADRs 0002 and 0003.
