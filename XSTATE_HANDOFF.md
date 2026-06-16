# XState migration — session handoff

Context primer for continuing the scene → XState v5 migration in a fresh chat.
Read this first, then the deep design doc:
**`docs/map-machine-transition-gating.md`** (the agreed map-machine + transition
reference). `XSTATE_MIGRATION.md` is the older/background reference.

---

## 0. How we work (the step-by-step method) — read this first

- **One explicit step at a time. Confirm between steps.** Don't chain ahead.
- **No tests, no app wiring, no adjacent refactors unless explicitly asked.**
  Build in isolation; integrate later as its own step. We are drafting machines
  to _review and refine_, not ship.
- **No premature implementation** — only the step at hand.
- **Docs before code:** fetch current docs before using a library/API. Use
  **context7** (`/statelyai/xstate`) for libraries, **WebFetch** for articles.
- **Minimal diffs**, match surrounding conventions.
- **Verify (when asked):** `npx tsc --noEmit` and `npx eslint <path>` must both
  be clean. `lint:strict` = `--max-warnings=0`, so warnings fail.
  `npx tsc --noEmit` currently exits clean (zero errors).

---

## 1. Goal & scope

Migrate the scene's state from **5 zustand stores + a `coordinators/` diff-watch
glue layer** to an **XState v5 actor system**. Statechart the orchestration core
(lifecycles + cross-actor edges); leaf/value state lives in machine context.
Libraries installed: `xstate@5.32.1`, `@xstate/react@6.1.0`.

Two problems being fixed: (1) coordinators react to _state diffs_, reconstructing
intent from timing; (2) the MapLibre imperative lifecycle race (`loading→ready`)
is patched ad hoc (`useRef` replay gate in `points/use-points-layer.ts` + the
`reactions` fly-guard).

---

## 2. Settled architecture — ONE actor system

```
app/(scene)/layout.tsx        ──> createActorContext(rootMachine)   [persistent]
   rootMachine
     ├─ invoke map  (systemId 'map')   ── persistent (session lifetime)
     ├─ invoke ui   (systemId 'ui')    ── persistent
     └─ on CITY.CHANGED: spawn city    ── dynamic, fresh per slug
          (stopChild previous; ref in root context.cityRef)
          └─ city invokes worker (listings recompute, off-main-thread)

app/(scene)/[city]/page.tsx   ──> resolves framing (server component)
   CityScene (client) = thin DISPATCHER: send CITY.CHANGED into root
```

- `invoke` = lifecycle bound to a state → the fixed set (`map`, `ui`).
- `spawn` + `stopChild` = dynamic, per-slug lifetime → `city` (ref in context).
- **One system** because the `(scene)` layout persists across nav but the
  `/[city]` page is the only place with city data; city data must enter via an
  **event** (`CITY.CHANGED`), and a 2nd `createActorContext` would be a separate
  system (`system.get` doesn't cross systems). So `city` is a **child of root**.

### State → machine (agreed grouping)

| machine    | lifetime                 | context (value state)                                                                                                             | finite states                                       |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **root**   | session                  | `cityRef`, `pendingSlug`                                                                                                          | `running{idle ⇄ navigating}`                        |
| **map**    | session                  | `mapRef`, `hexResolution`, `loadedSources`, `hexInspectInfo`, `pendingFitBounds`                                                  | `loading → ready{interactive ⇄ suppressed} → error` |
| **ui**     | session                  | `lens`, `selectedId`, `hoveredListingId`, `hoverSource`                                                                           | `active ⇄ navigating`                               |
| **city**   | per-slug                 | framing (slug/bbox/center/priceScale/priceCap/currency…), filter (roomTypes/priceRange/nbhd), worker output (aggregates/hexCells) | `loading → ready`                                   |
| **worker** | per-slug (child of city) | the `client` _is_ the actor                                                                                                       | `idle → computing → error`                          |

Notable: the old `listings` store dissolves (client→worker actor; aggregates/
hexCells→city context; errors→worker states). `mapStatus`→map finite states.
`cityBoundaryKey`/`resultsSlug` dropped (read via `system.get`; spawn/stopChild
makes stale-drop free). Filters fold into `city`.

---

## 3. Per-machine file layout (Sandro Maglione convention)

Each machine = a folder with 5 files, imported as namespaces:
`context.ts` (type + initial value share name `Context`), `input.ts`
(`Input` type + factory), `events.ts` (interfaces + `Events` union),
`actions.ts`, `machine.ts` (`setup({types,actors,actions}).createMachine`).
`import * as Context`, `import type * as Events/Input`.

Each `machine.ts` also exports `XxxMachineActor = ActorRefFrom<typeof xxxMachine>`
so hook files import the actor type without depending on the full machine module.

**Actions convention:** define `assign(...)` actions **inline in `machine.ts`'s
`setup({ actions })`**, not exported from `actions.ts`. Defining them outside
`setup` infers `MachineContext/AnyEventObject` (too wide) and causes a type
mismatch when registered. `actions.ts` is a stub with a note explaining this
(same decision for `map` and `ui` machines). Only use `actions.ts` for non-assign
imperative side-effects if needed.

---

## 4. Status — what's done

### PR1 + PR2 — COMPLETE ✅

The full migration is done. All zustand stores (`city-data/`, `filter/`,
`listings/`, `coordinators/`, `map-ui/`, `ui-state/`) and all coordinator glue
(`reactions.ts`, `url-sync.ts`, `fan-out.ts`, `recompute.ts`) have been deleted.
`npx tsc --noEmit` exits clean.

### 4a. Machines

- ✅ Scaffold: `root` + `map`/`ui`/`city`/`worker` folders (5 files each) +
  `provider.tsx` (`createActorContext(rootMachine)`, mounted in `app/(scene)/layout.tsx`).
- ✅ **Root machine COMPLETE:**
  - Invokes `map`+`ui`, spawns `city` on `CITY.CHANGED` (stopChild previous).
  - `running` has `idle ⇄ navigating` states.
  - `NAV.START { slug }` in `idle`: enters `navigating`, stamps `pendingSlug`,
    fans out to `map` + `ui` via `sendTo(system.get(...))`. Single dispatch point.
  - `NAV.START` in `navigating`: re-stamps `pendingSlug` only (map/ui already frozen).
  - `CITY.READY` in `navigating`: exits to `idle`, clears `pendingSlug`.
  - `CITY.CHANGED` on `running` parent (fires from both `idle` and `navigating`).
  - `prefetchCity` named action — stub in `setup({ actions })`; real impl
    injected via `machine.provide()` in `SceneProvider`, which closes over
    `useQueryClient()`. Fires at `NAV.START` in `idle`; prefetches
    `["boundaries", slug]` so the neighbourhood layer is warm on mount.
- ✅ **`provider.tsx` updated:** `SceneProvider` calls `useQueryClient()`,
  wraps `rootMachine.provide({ actions: { prefetchCity } })` in `useMemo`, and
  passes the result as the `logic` prop to `SceneActorContext.Provider`.
  **Pattern for future external deps:** any action needing a React context value
  (router, auth client, etc.) gets the same treatment — stub in `setup`, real
  impl in `provide()`. NOT stored in machine context (non-serializable).
- ✅ **`map` machine COMPLETE** — decisions locked (see
  `docs/map-machine-transition-gating.md`); all action bodies filled:
  - One hierarchical region: `loading → ready{interactive ⇄ suppressed} → error`
  - Machine is the interaction gatekeeper: pointer events wired only on
    `ready.interactive`; city-ingest events on the `ready` parent (flow in both).
  - Keep-dimmed on suppress; dim + loader derived by the view from
    `ready.suppressed`, not actions/flags.
  - Transition window: enter `suppressed` at `NAV.START`, exit at `CITY.READY`.
  - Readiness-race deferral = option D (reconcile on ready):
    `pendingFitBounds` buffer + `reconcileToReady` entry.
  - `applySelect` / `applyHover`: `assertEvent` narrows type; clears old
    feature state from `POINTS_SOURCE_ID` (last-wins); sets new; forwards
    `UI.SELECT` / `UI.SET_HOVER` to `system.get("ui")`.
  - `flyTo`: `fitBounds` + `setMaxBounds` (mirrors `setMapBounds` in
    `use-map-controls.ts`).
  - `clearInteractionState`: `removeFeatureState({ source: POINTS_SOURCE_ID })`
    — no key arg clears all state (selected + hovered). UI side already cleared
    by root's `NAV.START` fan-out.
  - `reconcileToReady`: applies `pendingFitBounds` if set, then reads
    `system.get("ui")?.getSnapshot()?.context` and re-applies
    `selectedId`/`hoveredListingId` feature states. Runs before
    `clearPendingFitBounds` in the entry array.
  - Uses `assertEvent` (from `xstate`) for all event-driven actions; entry
    actions (`clearInteractionState`, `reconcileToReady`) don't use it.
- ✅ **`ui` machine COMPLETE:**
  - Two states: `active ⇄ navigating` (topology enforces the nav window — no guards).
  - `active` accepts all `UI.*` events; `navigating` drops them structurally.
  - `NAV.START` in `active`: enters `navigating` + `clearSelectionAndHover` (folds
    `fan-out.ts` reset). No `NAV.START` handler in `navigating` — context is
    already clean on entry, and `UI.*` events are blocked so nothing can dirty it.
  - `CITY.READY` in `navigating`: exits to `active`.
  - `UI.SET_LENS` → `assignLens` (also clears `selectedId` when lens=`"analyse"`,
    folds `reactions.ts` edge).
  - `UI.SELECT` → inline assign `selectedId`.
  - `UI.SET_HOVER` → `assignHover` (nulls `hoverSource` when `id === null`).
  - All actions inline in `setup({ actions })` — see Actions convention above.
- ✅ **`city` machine COMPLETE:**
  - Context: `framing` (`MapCityPayload | null`), `filter` (nested:
    `roomTypes`/`priceRange`/`nbhd`), `aggregates`, `hexCells`.
  - **No `hexResolution` in city context** — reads from
    `system.get("map")?.getSnapshot()?.context.hexResolution` at send time.
  - Input: `{ framing: MapCityPayload }`. Root spawn passes `input: { framing: event.payload }`.
  - `city/events.ts`: FILTER.SET_ROOM_TYPES/PRICE_RANGE/NBHD,
    MAP.RESOLUTION_CHANGED (trigger only), WORKER.FETCH_OK/ERROR,
    WORKER.PROCESS_RESULT/ERROR.
  - `loading → ready → error`. Worker invoked at machine root (spans both states).
    `FILTER.*` assigns context then re-requests. `broadcastCityReady` sends to
    root/map/ui via `system.get` on first hex result. `forwardResolutionToCity`
    action in map machine forwards `MAP.RESOLUTION_CHANGED` → city.
- ✅ **`worker` machine COMPLETE:**
  - `fromCallback<Events.Events, Input.Input>` wrapping `CityListingsClient`.
  - **No `createMachine`** — client is the real state machine; XState just
    bridges its callbacks. Input: `{ slug }`. Cleanup: `client.dispose()`.
  - `worker/events.ts`: incoming events only (REQUEST_HEXES/AGGREGATES). Outgoing
    events declared in `city/events.ts` (city is the consumer).

### 4b. Layer component refactor — COMPLETE ✅

A `MapLayer` primitive centralises theme wiring and listener registration.

**`components/scene/map/layer.tsx`** (new):

- Exports `MapLayer`, `LayerListener`, `GetLayerStyles`.
- `LayerListener` discriminated union: `{ [K in keyof LayerListeners]-?: { type: K; listener: NonNullable<LayerListeners[K]> } }[keyof LayerListeners]`
- `GetLayerStyles = (theme: Theme, visible?: boolean) => LayerSpecification`
- Calls `useTheme()` internally, memoises spec, validates `id` via `isLayerId` (dev),
  converts array → `LayerListeners` object, calls `useLayerListeners`.
- Callers needing extra closure params (e.g. hex `breaks`) wrap with `useCallback([breaks])`.

**`components/scene/map/types.ts`**: added `isLayerId`; `LayerListeners` moved here
from (now-deleted) `stores/map-ui/types.ts`.

Domain layer components no longer accept a `theme` prop. Domain listener hooks return
`LayerListener[]` instead of calling `useLayerListeners` — pure factories.

### 4c. PR1 bridge wiring — COMPLETE ✅

All 10 steps done. `map-ui` + `ui-state` zustand stores deleted. `reactions.ts` +
`url-sync.ts` coordinators deleted. `SceneProvider` (XState) is the sole persistent
shell in `app/(scene)/layout.tsx`.

### 4d. Settled open questions

- **`NAV.START` fan-out — SETTLED:** root fans out to `map`+`ui` via `sendTo(system.get(...))`.
- **`CITY.READY` delivery — SETTLED:** `city` sends directly to root/map/ui via `system.get`.
- **`CITY.CHANGED` still needed — CONFIRMED:** carries `MapCityPayload`; separate from `NAV.START`.
- **`ui` nav topology — SETTLED:** `active ⇄ navigating` (topology enforces window, no guards).
- **`hexInspectInfo` home — SETTLED:** stays in `map` context (spatial, viewport-tied state).
- **`MapCityPayload` home — SETTLED:** moved to `data/types.ts` (alongside `CityData`,
  `ListingFilters`, `Scope`). Import path: `@/data/types`.

### 4e. React state layer — `components/scene/state/`

```
components/scene/state/
  machines/              ← machine definitions
    root/ map/ ui/ city/ worker/
  provider.tsx           ← SceneActorContext + SceneProvider (mounted in layout)
  hooks/
    utils.ts             ← createMachineStateSelector (MachineSelector<T> interface)
    use-root.ts          ← useRootRef, useRootSend
                            useNavStart, useDispatchCityChanged
    use-map.ts           ← useMapSend, useMapIsReady, useMapIsSuppressed,
                            useMapIsError, useMapRef,
                            useHexResolution, useHexInspectInfo, useIsSourceLoaded
                            useNotifyMapLoaded, useMapMounted, useMapReady,
                            useMapError, useMapSourceLoaded, useMapResolutionChanged,
                            useMapFitBounds, useMapHexInspect, useMapHover, useMapSelect
    use-ui.ts            ← useUiSend, useLens, useSelectedId,
                            useHoveredListingId, useHoverSource
                            useSetLens, useSelectListing, useSetHover
    use-city.ts          ← useCitySend, useCityFraming, useRoomTypes,
                            usePriceRange, useNbhd, useAggregates, useHexCells
                            useSetRoomTypes, useSetPriceRange, useSetNbhd
                            useSeedCityFilter
  index.ts               ← public barrel (all hooks + SceneProvider)
```

**Hook access patterns** (critical — don't change without reason):

- Root: `SceneActorContext.useActorRef()` / `SceneActorContext.useSelector()`
- Map/UI (session-persistent): `rootRef.system.get('map' | 'ui')` → stable ref
- City (dynamic): `SceneActorContext.useSelector(s => s.context.cityRef ?? undefined)`
  — reactive to spawn; `undefined` when no city yet (before first `CITY.CHANGED`)

**`createMachineStateSelector` pattern** (`hooks/utils.ts`):

```ts
// Zero-arg hook (most selectors):
const createMapSelector = createMachineStateSelector(useMapActorRef);
export const useHexResolution = createMapSelector(
  (s) => s.context.hexResolution,
);

// One-arg hook (parametric — use .with()):
export const useIsSourceLoaded = createMapSelector.with(
  (s, id: SourceId) => !!s.context.loadedSources[id],
);
// in a component: const loaded = useIsSourceLoaded('points');
```

The `MachineSelector<TActor>` interface (defined in `utils.ts`) describes the
callable + `.with()` shape. A single `as` cast on `useSelector` at module level
avoids repeating the raw `getSnapshot` conditional at every selector parameter.

`SupportedActor` includes `| undefined` so dynamic actors (city) flow through
`createMachineStateSelector` without special cases — `useSelector` from
`@xstate/react` natively accepts `undefined` as actor.

### 4f. Action hook layer — COMPLETE ✅

**Motivation:** components never touch event type strings. One hook per event
(returns a stable `useCallback`-wrapped fn); callers import the named hook.
Raw send hooks (`useUiSend`, `useMapSend`, `useRootSend`, `useCitySend`) kept as
escape hatches but have zero callers outside `state/hooks/`.

**`use-ui.ts`** — `useSetLens(lens)`, `useSelectListing(id)`, `useSetHover(id, source)`

**`use-map.ts`** — individual: `useMapMounted`, `useMapReady`, `useMapError`,
`useMapSourceLoaded`, `useMapResolutionChanged`, `useMapFitBounds`,
`useMapHexInspect`, `useMapHover`, `useMapSelect`;
compound: `useNotifyMapLoaded(mapRef, hexResolution)` — fires
`MAP.MOUNTED → MAP.READY → MAP.RESOLUTION_CHANGED` in order (used by `handleLoad`
in `map-canvas.tsx`).

**`use-root.ts`** — `useNavStart(slug)`, `useDispatchCityChanged(payload)`

**`use-city.ts`** — `useSetRoomTypes`, `useSetPriceRange`, `useSetNbhd`,
`useSeedCityFilter` (batch seed for URL restore; gates on `useCitySend` being
defined — callers must add `useCitySend()` as an effect dep so the effect
re-triggers after the city actor spawns).

**`useFilterBounds` pattern (dissolved):** no longer a hook — callers derive
bounds inline from `useCityFraming()`:

```ts
const city = useCityFraming();
const bounds = city
  ? { min: city.priceScale.min, max: city.priceCap }
  : { min: 0, max: 0 };
```

### 4g. Store dissolution — COMPLETE ✅ (PR2 steps 2.9a–e)

All zustand city stores deleted. `components/scene/stores/` no longer exists.

**What was migrated:**

| Zustand hook                                              | Replacement                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `useMapCity()`                                            | `useCityFraming()`                                                               |
| `useFilteredAggregates()`                                 | `useAggregates()`                                                                |
| `useRoomTypes/usePriceRange/useNbhd` (filter store)       | city machine selectors (same names, from `state`)                                |
| `useFilterActions().seed(...)`                            | `useSeedCityFilter(filter)`                                                      |
| `useFilterActions().setRoomTypes/setPriceRange/reset`     | `useSetRoomTypes/useSetPriceRange` + inline `reset`                              |
| `useFilterActions().setNeighbourhood/toggleNeighbourhood` | `useSetNbhd` + inline toggle                                                     |
| `useFilterBounds()`                                       | inline from `useCityFraming()`                                                   |
| `HexRecomputeSync` component                              | dissolved — city machine owns recompute on `FILTER.*` + `MAP.RESOLUTION_CHANGED` |
| `CityStoreProvider` wrapper                               | removed from `city-scene.tsx` (bare fragment)                                    |

**Key decisions from dissolution:**

- `useSeedCityFilter` returns a no-op until the city actor exists. `UrlStoreSync`
  adds `useCitySend()` as a dep and guards `!citySend` so the effect waits for
  the first city spawn — naturally re-triggers on the re-render after
  `CITY.CHANGED`.
- `setRoomTypes` normalization ("all selected = `[]`") moved inline into
  `use-filters.ts`'s `useCallback` wrapper (was in zustand action creator).
- `toggleNeighbourhood` inlined in `use-scope.ts` as
  `useCallback((id) => setNbhd(nbhd === id ? null : id), [setNbhd, nbhd])`.
- `MapCityPayload` relocated from `stores/city-data/types.ts` → `data/types.ts`.

---

## 5. Migration complete — no remaining work

PR1 and PR2 are both fully done. The scene runs entirely on the XState actor
system. There are no zustand stores, no coordinator files, and no bridge
components remaining.

**Key decisions settled — don't re-open:**

- `hexResolution` — single source of truth in map machine; city reads snapshot
  at send time, no copy in city context.
- `CITY.READY` — fires on every hex result; structural ignoring in root/map/ui
  means no "first only" guard needed.
- Worker — `fromCallback`, not `createMachine`; `CityListingsClient` is the
  real state machine inside.
- `MAP.RESOLUTION_CHANGED` — forwarded map → city as a **trigger only**
  (no assign); `requestHexes` reads resolution from `system.get("map")` snapshot.
- `MapCityPayload` — lives in `data/types.ts`.

---

## 6. Key files & commands

- State layer (machines + hooks): `components/scene/state/`
- Public import path for UI components: `@/components/scene/state`
- City framing type: `MapCityPayload` in `@/data/types`
- Design doc (authoritative for map): `docs/map-machine-transition-gating.md`
- Scene dispatcher: `components/scene/city-dispatcher.tsx`
- NAV.START source: `components/scene/city-switcher.tsx`
- URL seeding (once per session): `components/scene/url-store-sync.tsx`
- URL write sync (reactive): `components/scene/url-write-sync.tsx`

```bash
npx tsc --noEmit
npx eslint components/scene/state
pnpm test                       # only when asked
```

Docs to consult: context7 `/statelyai/xstate` (invoke vs spawn, parallel vs
nested states, relative targets `.child`, `assign`/`enqueueActions`,
`createActorContext`, `system.get`); note **v5 has no built-in event deferral**.
Use Stately docs ID `/statelyai/docs` (higher benchmark score than `/statelyai/xstate`).
