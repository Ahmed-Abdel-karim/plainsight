# Plainsight Architecture Findings

> Status: Working discussion document for the clean-code / architecture-polish
> workstream. This file captures the resources, audit frame, findings, naming
> concerns, and proposed step order so later chats can continue without
> re-deriving the context.

> **Update — folder architecture restructured (feature-based).** Product code
> moved from `components/scene/` to `features/scene/` (and `features/home/`);
> `components/` is now shared UI only (`ui/`, `theme/`, `query/`, `logo`). Deep
> relative chains were replaced by `@/…` aliases, the `browse → analysis/format`
> sideways dep was removed via `scene/shared/`, and the barrel rule is now
> **public-API-only** (feature roots + cross-consumer subsystems; direct imports
> within a feature). This supersedes the earlier "barrel = full public API" note
> in Finding 6 — the `scene/state` hooks barrel is still kept, now as a subsystem
> public API. See the rewritten "Folder structure" section of `CLAUDE.md`.

## Goal

Finalize Plainsight as a senior React / Next.js portfolio project without adding
features. The work here is not a rewrite. The goal is to make the existing
architecture easier to understand, easier to review, and more obviously
human-directed:

- clearer domain vocabulary
- cleaner React / Next.js boundaries
- less stale implementation-history commentary
- tighter public APIs and component reuse
- accessibility decisions that are intentional and documented
- code that reads like a finished product, not a feature-delivery transcript

## Resource Grounding

### Official React / Next.js docs

- Next.js App Router data fetching and Server Component patterns:
  https://nextjs.org/docs/app/building-your-application/data-fetching
- Next.js App Router migration examples for async Server Components and server
  data access:
  https://nextjs.org/docs/app/guides/migrating/app-router-migration
- React: keeping components and hooks pure:
  https://react.dev/reference/rules/components-and-hooks-must-be-pure
- React: you might not need an effect:
  https://react.dev/learn/you-might-not-need-an-effect
- React: reusing logic with custom hooks:
  https://react.dev/learn/reusing-logic-with-custom-hooks
- React Activity:
  https://react.dev/reference/react/Activity

### Nadia Makarevich / Developer Way

- React project structure for scale:
  https://www.developerway.com/posts/react-project-structure
- React components composition:
  https://www.developerway.com/posts/components-composition-how-to-get-it-right
- React re-renders guide:
  https://www.developerway.com/posts/react-re-renders-guide
- React elements, children, parents, and re-renders:
  https://www.developerway.com/posts/react-elements-children-parents
- Custom hooks performance:
  https://www.developerway.com/posts/why-custom-react-hooks-could-destroy-your-app-performance

### Aurora Scharff

- Component architecture for React Server Components:
  https://aurorascharff.no/posts/component-architecture-for-react-server-components/
- Server and Client Component composition in practice:
  https://aurorascharff.no/posts/server-client-component-composition-in-practice/
- Managing advanced search param filtering in the Next.js App Router:
  https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/
- The Precompute Pattern:
  https://aurorascharff.no/posts/the-precompute-pattern-encoding-dynamic-data-into-urls-in-nextjs/
- Error handling in Next.js with catchError:
  https://aurorascharff.no/posts/error-handling-nextjs-catcherror/

### Accessibility

- W3C ARIA Authoring Practices, keyboard interface:
  https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- W3C ARIA Authoring Practices, accessible names and descriptions:
  https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
- W3C ARIA Authoring Practices, read me first:
  https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
- WCAG 2.2:
  https://www.w3.org/TR/WCAG22/

### Portfolio Benchmarks

- Brittany Chiang:
  https://brittanychiang.com/
- Tania Rascia:
  https://www.taniarascia.com/
- Josh Comeau:
  https://www.joshwcomeau.com/
- Tim Holman:
  https://tholman.com/
- Frontend Mentor portfolio guidance:
  https://www.frontendmentor.io/articles/building-an-effective-frontend-developer-portfolio--7cE8BfMG_

## Audit Frame

### What is already strong

- The route-group scene layout is the right Next.js shape. The persistent
  `(scene)` layout owns long-lived scene providers and the WebGL map; the city
  page owns city-specific sidebar / drawer chrome.
- The app uses a narrow client-island approach where the map, URL sync, state
  actors, and interactive controls are client-side, while route data and static
  city framing stay server-side.
- XState actor boundaries are a real architectural asset: root, map, city, ui,
  and worker each have a defined lifetime.
- The data seam is strong: UI reads through `data/loaders.ts`; repository details
  stay behind the port / adapter boundary.
- The testing direction is portfolio-worthy: goal-driven tests, unit tests for
  pure kernels, integration tests around user-visible behavior, and a documented
  strategy for WebGL / E2E scope.

### What needs cleanup

- Naming often describes placement or feature-plan history instead of domain
  meaning.
- Several comments still reference spec IDs, old component names, or earlier
  implementation stages.
- Some implementation residue remains, including at least one stray
  `console.log`.
- ~~Some public exports are broader than the documented "feature barrel exports
  components only" rule.~~ Resolved: the rule was changed — the barrel is now a
  feature's full public API (components, hooks, utils, types), so the broad
  state-hook barrel is intentional and compliant.
- Accessibility semantics should stay tied to the UI's real behavior. The lens
  control is now a segmented mode switch, not detached tabs.

## Findings

### 1. Vocabulary and naming drift

Status: completed for live source in this workstream's first pass. Historical
references in `specs/` were intentionally left alone because they describe past
feature planning.

The largest polish gap is vocabulary. Names such as:

- `SidebarContent`
- `SidebarAnalysis`
- `SidebarBrowse`
- `SidebarScopeType`
- `getSidebarScopeAggregates`
- `getSidebarFilterBounds`
- `getSidebarListingCount`

describe where the UI happens to render today, not the product concept. This is
especially awkward because the same content serves both desktop sidebar and
mobile drawer.

Applied vocabulary:

| Previous                    | Current                |
| --------------------------- | ---------------------- |
| `SidebarContent`            | `MarketPanelContent`   |
| `SidebarAnalysis`           | `AnalysisPanel`        |
| `SidebarBrowse`             | `BrowsePanel`          |
| `SidebarFoot`               | `DataProvenance`       |
| `SidebarScopeType`          | `ScopeType`            |
| `getSidebarScopeAggregates` | `getScopeAggregates`   |
| `getSidebarFilterBounds`    | `getFilterBounds`      |
| `getSidebarListingCount`    | `getScopeListingCount` |

### 2. Implementation-history comments

Several comments still carry delivery-plan language:

- `E1-S1`, `E4-S1`, `E5`, `E7-S2`, `FR-013`, etc.
- references to old names such as `SceneStoreSync`
- "Not yet connected to the app" in `components/scene/state/provider.tsx`
- comments explaining why code changed, rather than what contract exists now

Preferred direction:

- Keep comments that explain subtle timing, caching, URL sync, or actor lifetime.
- Remove story/task IDs from source files.
- Replace old-name comments with current architectural contracts.
- Keep deeper narrative in docs / ADRs, not inline code.

### 3. Stray debug residue

`components/scene/scene-url-loader.tsx` currently logs `city.cityName` inside
the URL seeding effect.

Preferred direction:

- Remove the log.
- During cleanup, scan for `console.`, `TODO`, `FIXME`, old feature IDs, and
  stale references.

### 4. Server / Client boundary clarity

The broad shape is correct:

- `app/(scene)/layout.tsx` owns persistent providers and `MapView`.
- `app/(scene)/[city]/page.tsx` resolves city metadata and renders `SceneView`.
- `SceneView` creates a promise for city framing and passes it to the client URL
  seeding island.
- Small server-facing tiers flow through server loaders; immutable browser tiers
  are fetched directly from the configured public asset origin.

Risks / cleanup targets:

- Comments use "store" language in places where the current architecture is
  XState actors.
- Some names make the data flow feel more coupled to the sidebar than it is.
- The code should clearly distinguish:
  - persistent scene shell
  - city-scoped overlay
  - market panel content
  - lens-specific panels
  - map layers

### 5. React component composition and reuse

The strongest reuse decision is correct: one panel content tree serves desktop
sidebar and mobile drawer, with no `isMobile` prop and no duplicate component.

Cleanup targets:

- Rename placement-based components to domain names.
- Keep presentational UI separated from stateful controllers where it already
  exists, e.g. `FilterPanel` and `FilterPanelUi`.
- Avoid over-generalizing leaf components used once.
- ~~Check if repeated room labels belong in one shared module instead of
  duplicated records.~~ Done. Five scattered room-type maps (three byte-identical
  short-label records in `browse-panel`, `filter-panel-ui`, `room-mix-bar`; the
  long-label + dot pairing in `browse/room-display` and `points-legend`) are
  collapsed into one `components/scene/room-display.ts` module exposing
  `{ short, long, dot }` per `RoomType`. The map circle layer's hex ramp
  (`map/layers/points/styles.ts`) stays separate — MapLibre can't read the
  Tailwind tokens. Labels are unchanged per call site, so no behaviour change.

### 6. Hook and selector surface

Status: resolved. The state barrel exports its hook modules with `export *`
(`SceneProvider` plus the four `use-*` machine hooks). The `CLAUDE.md` rule was
changed so a barrel is a feature's full public API — components, hooks, utils,
and types — rather than components only. With XState the hooks _are_ the public
surface, so the broad export is intentional and compliant. The machine guts
(`rootMachine`, `setup()`, actions, actor definitions) stay unexported, so no
internals leak.

### 7. Accessibility decisions

Status: resolved for the lens control. The old tab pattern was replaced with a
single-select segmented control.

Most widgets are built on shadcn / Radix primitives, which is good. The app also
uses role/name queries and axe tests in several places.

Decision:

- Analyse/Browse is a global scene mode, not a colocated tab panel.
- The control changes multiple regions: market panel content, map layers,
  legends, and listing selection behavior.
- Therefore the visible control uses a single-select shadcn `ToggleGroup` with
  `aria-label="Market lens"` instead of tablist / tabpanel semantics.

### 8. Portfolio packaging implications

Once cleaned, documented, CI-backed, and deployed, Plainsight compares well to
senior frontend portfolio projects because it has:

- a real product surface
- geospatial WebGL
- large-list virtualization
- actor-based state architecture
- typed data contracts
- accessibility and test strategy
- a deployable Next.js app

The remaining portfolio gap is framing:

- README with live demo, screenshots, architecture summary, and tradeoffs
- architecture docs / ADRs that justify human decisions
- case-study narrative: problem, hard parts, tradeoffs, future work
- personal portfolio page or project page that points to Plainsight

## Proposed Fix Order

### Step 1: Vocabulary decisions

Status: completed for the agreed misleading names.

Applied dictionary:

| Current                     | Proposed                                                  |
| --------------------------- | --------------------------------------------------------- |
| `SidebarContent`            | `MarketPanelContent`                                      |
| `SidebarAnalysis`           | `AnalysisPanel`                                           |
| `SidebarBrowse`             | `BrowsePanel`                                             |
| `SidebarFoot`               | `DataProvenance`                                          |
| `SidebarScopeType`          | `ScopeType`                                               |
| `getSidebarScopeAggregates` | `getScopeAggregates`                                      |
| `getSidebarFilterBounds`    | `getFilterBounds`                                         |
| `getSidebarListingCount`    | `getScopeListingCount`                                    |
| `SceneUrlLoader`            | discuss: `SceneUrlSeeder`, `SceneUrlInitializer`, or keep |
| `UrlWriteSync`              | discuss: `SceneUrlSync`, `UrlStateSync`, or keep          |
| `LensActivity`              | discuss: `LensPanels`, `LensContent`, or keep             |

### Step 2: Low-risk residue cleanup

Status: complete. A full sweep (`console.`, `TODO`/`FIXME`, `E#-S#`, `FR-###`,
old names, "not yet connected") finds no remaining source residue — the only
matches are inside `data/cities/*.geojson` listing names (London postcodes like
`E14`, "HACKNEY"), which are real data, not code. The last two stray IDs
(`E6-S5` in `lib/filters/sort.ts`, `FR-007` in `lib/hex/aggregate.ts`) are
removed in the working tree.

- ~~Remove stray `console.log`.~~ done
- ~~Remove stale "not yet connected" comment.~~ done
- ~~Replace old `SceneStoreSync` reference.~~ done
- ~~Remove spec/task IDs from comments in `data/`, `lib/`, and components.~~ done

### Step 3: Naming pass

- Rename the agreed components, types, and data loader functions.
- Update tests and imports.
- Keep behavior unchanged.

### Step 4: Public API / barrel pass

Status: resolved. See Finding 6 — the `CLAUDE.md` barrel rule now treats a
barrel as a feature's full public API, so the broad state-hook exports are
intentional and compliant. No code change needed; the guidance is the change.

### Step 5: Accessibility semantics decision

Status: completed for the lens control.

- Lens switching is a segmented mode switch.
- The implementation uses `LensSwitcher` and shadcn `ToggleGroup`.

### Step 6: Verification

Run after edits:

```bash
pnpm format:check
pnpm lint:strict
npx tsc --noEmit
pnpm test
pnpm build
```

If changes touch visual scene behavior, run the project visual verification flow
after the app is green.

## Open Discussion Questions

1. Should the primary term be `market panel`, `scene panel`, or `explorer panel`?
2. Should `Analyse` remain British spelling in UI and code, or should code use
   `analysis` while UI keeps `Analyse`?
3. Is `lens` the right product word, or should code move toward `mode` / `view`?
4. Are the lens controls tabs, or are they a segmented mode switch?
5. ~~Should state hooks be exported through a broad state barrel, or should each
   public hook be explicitly named?~~ Resolved: broad barrel. The `CLAUDE.md`
   rule now makes the barrel a feature's full public API.
