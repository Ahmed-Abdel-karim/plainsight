> **SUPERSEDED** — the implemented design is documented in
> `docs/scene-navigation-architecture.md`. This file is kept as historical
> background: it captured the exploration (nested suppression, root-owned gate,
> prefetch-on-`NAV.START`) that the final design moved past (parallel map regions,
> a dedicated `navigation` path tracker, a flat root coordinator, `SUSPEND`/
> `RESUME`). Read it for rationale, not for current behaviour.

Plainsight — Map machine + the navigation→ready window (design sketch)

Companion to `XSTATE_HANDOFF.md` and `XSTATE_MIGRATION.md`. This is a **design
sketch**, not shipped code — it records the agreed shape of the `map` machine
(PR1 readiness race + transition gating) **and** how the whole actor system
behaves during the window between a user clicking a city route and that city's
data being loaded and propagated into state. When this and the handoff disagree,
the handoff wins.

## What this models

The `map` actor is the session-persistent bridge to the imperative MapLibre
instance (it lives in `app/(scene)/layout.tsx`, so it survives `/[city]`
navigation). It is **one hierarchical region** — the MapLibre instance
lifecycle — with the city-transition gate nested inside `ready`:

```
loading → ready → error
            ├─ interactive   accepts pointer interactions (SELECT/HOVER/HEX_INSPECT)
            └─ suppressed     a city change is in flight: interactions structurally
                              ignored; old selections cleared on entry
```

| state                                  | concern                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loading → ready → error`              | the MapLibre instance lifecycle (PR1 readiness race)                                                                                                 |
| `ready.interactive ⇄ ready.suppressed` | whether the map responds to the user — `interactive` until **`NAV.START`** (click), back at **`CITY.READY`** (the relocated `transition-supervisor`) |

**Why nested, not a parallel `freshness` region.** Suppression only means
anything while `ready` — a `loading`/`error` map paints nothing to suppress, so a
suppressed-vs-live distinction there is moot. The gate is therefore a
_refinement of_ `ready`, not an orthogonal lifecycle. Nesting also makes the
**machine** the gatekeeper: pointer interactions are wired only on
`ready.interactive`, so in `suppressed` they're structurally ignored — the view
cannot act on stale data even if it dispatches.

**The event split that makes this work.** Events that bring the _new_ city in —
`MAP.FIT_BOUNDS` (the fly to the new bbox), `MAP.SOURCE_LOADED`,
`MAP.RESOLUTION_CHANGED` — sit on the `ready` **parent** so they flow in _both_
children. Only pointer interactions live on `interactive`. That is what lets
`suppressed` reject interaction yet still ingest the incoming city. "Suppressed"
means _no pointer interaction_, not _no events_.

## The navigation→ready window (spans all machines)

There is a gap between the user clicking a city link and that city's data being
in state. `CITY.CHANGED` fires when the new `/[city]` page mounts and resolves
its framing promise — that is the **end** of the route-pending window, not the
start. The full timeline:

```
click Link ─▶ [Next.js route pending: RSC + framing resolving] ─▶ page mounts ─▶ spawn city ─▶ worker ─▶ ready
            │                                                    │                            │
         NAV.START                                          CITY.CHANGED                  CITY.READY
         (slug known from href)                             (framing in hand)             (results stamped + bbox)
```

Why this is not a uniform "add a state to every machine":

- **The map is the one surface with no Suspense fallback.** The `(scene)` layout
  persists across navigation, so the sidebar/page chrome already shows a loader
  via their own Suspense boundaries during the pending window. The map lives in
  the layout — it does **not** remount or suspend — so without explicit handling
  it sits fully interactive showing city A while city B loads. That is the real
  reason this window matters, and why the map's `ready.suppressed` trigger is
  **`NAV.START`**, not `CITY.CHANGED`. Do not double up loaders where Suspense
  already covers the chrome.

- **`root` owns the navigation lifecycle; the others react.** Root is the only
  actor whose lifetime spans the whole window (layout-persistent _and_ the owner
  of the city spawn). It holds `pendingSlug` and a `navigating` state, fed by a
  `NAV.START { slug }` event dispatched by the click source (the city-picker
  `<Link>` — the thing that initiates the nav announces it). `pendingSlug` also
  gives **latest-wins for free**: rapid re-clicks or an aborted nav just
  overwrite it.

| machine  | needs                                                                               | why                                                               |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **root** | a **state** (`idle`/`navigating` + `pendingSlug`)                                   | owns the nav lifecycle; handles latest-wins / abort               |
| **map**  | a **state** — enter `suppressed` at `NAV.START`, exit at `CITY.READY`               | doesn't suspend; the real reason the window matters               |
| **ui**   | a **reaction**, not a state — clear `selectedId`/hover on `NAV.START` (keep `lens`) | old selection / detail panel shouldn't linger over a loading city |
| **city** | nothing new — the _old_ city actor stays alive until `CITY.CHANGED` stops it        | enables the keep-old-visible choice below                         |

## Source-of-truth rule (do not violate)

`ready.interactive/suppressed` is **driven by events, never by reading-and-diffing
city state**. The `city` actor stays the single source of truth for "has the new
city converged":

- the click source dispatches `NAV.START` → root enters `navigating`/stamps
  `pendingSlug`, and the map enters `ready.suppressed` (this is the early
  trigger that beats the route-pending window). A route-initiated switch
  (browser Back/Forward) has no click-time `NAV.START`; root recognizes its
  `CITY.CHANGED` as an in-scene replacement and synthesizes the same fan-out, so
  every in-scene switch is gated alike.
- the new page mounts and dispatches `CITY.CHANGED` with framing → root spawns a
  fresh `city`.
- `city` emits `CITY.READY` once the worker results stamp in (and the target
  bbox is known) → root returns to `idle`, map returns to `ready.interactive`.
- if the load terminally fails, `city` emits **`CITY.FAILED`** (the mirror of
  `CITY.READY`) → root returns to `idle`, map returns to `ready.interactive`, ui
  returns to `active`. The gate must end on both outcomes; the failure toast
  comes from the city's emitted `city.error`.

The map mirrors nothing and polls nothing. This is the actor-correct replacement
for `coordinators/transition-supervisor.ts` (which today _reads_ `resultsSlug`
vs the target slug). **DECISION: keep dimmed, not blank** — the old city's layers
stay painted (dimmed) through the window and are _swapped_ when the new city's
results land, avoiding a flash-of-empty. So we deliberately do **not** clear the
data on `NAV.START`; the only explicit clear is MapLibre **feature-state** for
hover/select highlights (keyed by the old city's feature IDs). The natural swap
falls out of the spawn: `city` is spawned fresh, the new `cityRef` starts with
empty `hexCells`/`aggregates`, and the old actor is stopped — so once the new
worker fills in, city A's hexes are replaced by construction.

## Suppressed-state scope (DECIDED: dim + interaction, not a full lock)

`ready.suppressed` is scoped to **dim + interaction**, not a full input lock:
dim the hex/points data layers (keep them visible), clear hover/select
feature-state, show a loader overlay, and ignore feature interactions — but leave
base-map pan/zoom and the camera fly-to-new-bbox alone (a hard input lock during
the fly feels janky and the fly wants the camera anyway).

The dim styling and the loader are **derived by the view from the
`ready.suppressed` state** (e.g. `snapshot.matches({ ready: "suppressed" })`) —
they are _not_ machine actions or context flags. That removes the
`dimDataLayers`/`undimDataLayers`/`showLoader`/`hideLoader` actions and the
`loaderVisible` field entirely: there's nothing to keep in sync with the state
because the state _is_ the source. The only entry effects that remain are
`clearInteractionState` + `resetHexInspect` (clearing the old city's
highlights/popup — work that can't be derived).

## Readiness-race deferral (DECIDED: option D — reconcile on ready)

When the city's data is ready but the MapLibre instance isn't (`loading`), the
fly-to-bbox and any selection have nowhere to land yet. The old code patched this
with a `useRef` replay gate in `points/use-points-layer.ts` + a `reactions`
fly-guard. XState v5 has **no built-in event deferral**, so the options were:

- **A — source-side gate** (view withholds sends until ready): rejected, it _is_
  the status quo PR1 deletes.
- **B — event buffer + replay** (push every event to a `context` array, `raise`
  on `ready` entry): replays stale storms; treats durable state as an event log.
- **C — coalescing buffer** (latest-per-type, applied on entry): better than B.
- **D — reconcile on ready (chosen)**: don't replay events; on entry to `ready`,
  sync the imperative layer to _current durable truth_.

D wins because in this architecture the "deferred" things mostly **aren't
ephemeral events**: `SELECT`/`HOVER` are owned by the `ui` machine (so on `ready`
entry the map just re-applies `ui`'s current selection/hover — a `SELECT` from a
list click during loading needs no buffer), and `HEX_INSPECT` can't fire before
the map paints. The _only_ genuinely ephemeral command with no other home is
`FIT_BOUNDS`, so it gets a one-field coalescing buffer (`pendingFitBounds`,
last-wins). `applyCurrentStateToMap` on `ready` entry flies to it and re-applies
selection/hover, then `clearPendingFitBounds` drops the buffer. Idempotent, no
stale storm, and the `useRef` gate + fly-guard are deleted. Cost: `applyCurrentStateToMap`
reads `system.get('ui')` (a session-persistent sibling, always present).

## Machine sketch

```ts
// components/scene/machine/map/machine.ts  (SKETCH — not the skeleton in tree)
import { setup } from "xstate";

import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

export const mapMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actions: {
    // suppressed-entry cleanup — imperative MapLibre calls + a context reset
    // that can't be derived. Dim styling + loader are NOT actions — the view
    // derives them from `ready.suppressed` (so no dim/undim/show/hide to sync).
    clearInteractionState: () => {
      /* removeFeatureState for hover + select */
    },
    resetHexInspect: () => {
      /* assign hexInspectInfo: null */
    },
    // lifecycle / bookkeeping
    captureMapRef: () => {
      /* assign mapRef from MAP.MOUNTED */
    },
    markSourceLoaded: () => {
      /* assign loadedSources[id] = true */
    },
    // readiness-race deferral (option D)
    savePendingFitBounds: () => {
      /* assign pendingFitBounds = latest bbox (last-wins) */
    },
    clearPendingFitBounds: () => {
      /* assign pendingFitBounds: null */
    },
    applyCurrentStateToMap: () => {
      /* fly to pendingFitBounds (if any) + re-apply
                                selection/hover from system.get('ui') */
    },
  },
}).createMachine({
  id: "map",
  context: Context.Context,
  initial: "loading",
  on: {
    // mount can arrive in any state
    "MAP.MOUNTED": { actions: "captureMapRef" },
  },
  states: {
    loading: {
      on: {
        "MAP.READY": "ready", // fired once MapLibre 'load' resolves
        "MAP.ERROR": "error",
        // readiness-race deferral (option D): coalesce the latest bounds; applied
        // by `applyCurrentStateToMap` on entry to `ready`. SELECT/HOVER not buffered
        // (truth lives in `ui`); HEX_INSPECT can't occur before paint.
        "MAP.FIT_BOUNDS": { actions: "savePendingFitBounds" },
      },
    },

    ready: {
      initial: "interactive",
      // sync the imperative layer to durable truth once, then drop the buffer
      entry: ["applyCurrentStateToMap", "clearPendingFitBounds"],
      on: {
        // bring the new city in — flow in BOTH children (incl. suppressed)
        "MAP.FIT_BOUNDS": { actions: "flyTo" },
        "MAP.SOURCE_LOADED": { actions: "markSourceLoaded" },
        "MAP.RESOLUTION_CHANGED": { actions: "setResolution" },
        // nav only matters once ready; covers interactive→suppressed and a
        // re-click while already suppressed (reenter re-runs the cleanup)
        "NAV.START": { target: ".suppressed", reenter: true },
      },
      states: {
        interactive: {
          on: {
            // pointer interactions live ONLY here → structurally gated
            "MAP.SELECT": { actions: "applySelect" },
            "MAP.HOVER": { actions: "applyHover" },
            "MAP.HEX_INSPECT": { actions: "setHexInspect" },
          },
        },
        suppressed: {
          // keep-dimmed: clear the old city's hover/select + inspect popup, but
          // do NOT clear the data — it stays visible (dimmed) until new results
          // swap it. Dim + loader are derived by the view from this state.
          entry: ["clearInteractionState", "resetHexInspect"],
          on: {
            // city converged (results stamped + bbox known)
            "CITY.READY": "interactive",
            // terminal load failure — lift the gate so the map stays operable
            "CITY.FAILED": "interactive",
            // interactions absent here on purpose — the machine, not the view,
            // enforces the gate.
          },
        },
      },
    },

    error: {},
  },
});
```

## Context fields (the value state this machine owns)

Per the state-grouping table we agreed (see also the migration doc):

```ts
// components/scene/machine/map/context.ts  (SKETCH)
export interface Context {
  mapRef: MapRef | null; // the MapLibre instance
  hexResolution: HexResolution; // map-derived; worker reads it via system.get('map')
  loadedSources: Partial<Record<SourceId, boolean>>; // which sources hold parsed data
  hexInspectInfo: HexInspectInfo | null; // clicked-hex popup (judgment call: could live in ui)
  pendingFitBounds: BBox | null; // readiness-race buffer; applied on entry to `ready`
}
// NB: no `loaderVisible` / `mapStatus` — the loader is derived from the
// `ready.suppressed` state, and map status is the top-level lifecycle.
```

Notes / deliberate omissions vs today's `map-ui` store:

- **`mapStatus` is gone as a value** — it became the top-level `loading → ready →
error` states. That is the point of PR1.
- **`cityBoundaryKey` is dropped** — it only existed because the map store could
  not read the city store. The neighbourhoods layer now reads the slug via
  `system.get('city')`; no bridge field.
- **`resultsSlug` is not here** (and largely dissolves) — with spawn/stopChild
  the previous city + worker are stopped, so late replies can't land. Keep a
  minimal guard only if a worker reply can outlive `stopChild`.

## Events this machine consumes

```ts
// components/scene/machine/map/events.ts  (SKETCH — additions to the union)
type MapReady = { type: "MAP.READY" };
type MapError = { type: "MAP.ERROR" };
type MapSelect = { type: "MAP.SELECT"; id: number | null };
type MapHover = {
  type: "MAP.HOVER";
  id: number | null;
  source: "list" | "map" | null;
};
type MapFitBounds = { type: "MAP.FIT_BOUNDS"; bbox: BBox };
type MapSourceLoaded = { type: "MAP.SOURCE_LOADED"; sourceId: SourceId };
type NavStart = { type: "NAV.START"; slug: string }; // dispatched at click, before the route loads
type CityReady = { type: "CITY.READY" }; // emitted by city when results land
```

(`CITY.CHANGED { framing }` is a **root** event, not a map event — root spawns the
city from it; the map only cares about `NAV.START` and `CITY.READY`.)

## Navigation boundary contract (DECIDED)

The navigation lifecycle is extracted out of `root` into a dedicated
**`navigation`** machine, and the fan-out is reframed so the nav machine knows
nothing about any child's internals. This supersedes "root owns the navigation
lifecycle" above: root shrinks to a **bootstrap** that invokes
`map`/`ui`/`worker`/`navigation`; `navigation` owns the window.

**One-line boundary:** _nav owns "where we're going and the gate"; each machine
owns "what that means for me."_

### 1. The `navigation` machine owns the window

- **Route listener.** A `fromCallback` actor, invoked while running, that
  subscribes to **`pathname` only** (the `/[city]` segment) — never
  `searchParams`. This is what makes `syncUrl`'s search-param writes safe: they
  can't re-trigger the listener (no feedback loop), while Back/Forward across
  cities still fires it. This replaces pages imperatively dispatching
  `CITY.CHANGED`.
- **The gate** — `idle ⇄ navigating` and `pendingSlug` (latest-wins).
- **The `city` actor lifecycle** — spawn/stop. Safe to move off root because
  `systemId` is global to the actor system: `system.get(SystemId.CITY)` still
  resolves for `map`/`ui`/`worker` even though `city` is now spawned under
  `navigation`.
- **The fan-out — as a broadcaster only** (see §3).

### 2. Two phases, one gate — not merged into one event

A click produces the **eager** signal _before_ the route commits; the listener
produces the **committed** signal when `pathname` changes (and is the _only_
signal on Back/Forward, which has no click).

- Eager click → opens the gate (`navigating`), broadcasts suppression, announces
  the prefetch target.
- Committed listener → spawns/swaps the `city` actor with its framing payload.
- Because the eager click already moved nav to `navigating`, the committed event
  lands with the gate **already open** and only swaps the city — it does **not**
  re-run the suppression fan-out. Only Back/Forward lands in `idle` and
  synthesizes suppression (today's `isInSceneCityChange`, restated for the new
  home). So merging the two into a single event/action is unsafe: a click would
  otherwise double-fire the eager and committed work.

### 3. Generic broadcast vocabulary — nav stays dumb

The nav machine emits exactly two events that **every** child interprets in its
own terms (chosen over per-child vocab that nav would have to translate):

- `NAV.STARTED { slug, snapshotId }` — eager
- `NAV.SETTLED` — converged/settled (covers both `CITY.READY` and `CITY.FAILED`
  outcomes; the gate must end on either)

Nav carries no machine-specific meaning. Per-machine interpretation:

| machine | `NAV.STARTED`                                                                   | `NAV.SETTLED`         |
| ------- | ------------------------------------------------------------------------------- | --------------------- |
| **map** | → `ready.suppressed` (payload **ignored** — it only cares that it's suppressed) | → `ready.interactive` |
| **ui**  | → `navigating` + clear `selectedId`/hover (keep `lens`)                         | → `active`            |

The map's older `NAV.START` trigger and its `CITY.READY`/`CITY.FAILED`-on-
suppressed exits collapse into this single phase pair.

### 4. Prefetch is per-machine, not nav's job

The broadcast **announces the target** (`slug`/`snapshotId`); each machine
prefetches **its own** resource off it. The boundaries prefetch currently in
`provider.tsx`'s injected `prefetchCity` moves to whoever owns boundaries; the
map prefetches its own bounds/tiles if it wants. Nav does not orchestrate
prefetch — it only says where we're going.

### Business assumption — one snapshot per city (for now)

**One city = one snapshot** is a business rule. `snapshotId` is therefore
**derived from the slug**, never carried in the URL:

- Reconciliation stays keyed on **`pathname` (slug only)**; the URL never gains a
  `snapshotId` param, so no new feedback-loop surface (cf. the `pathname`-only
  listener in §1).
- A single **`slug → snapshotId` lookup at the extractor (edge)** is the one
  resolution point. The eager click and every external/committed source
  (Back/Forward, deep link, reload) resolve `snapshotId` the same way — so there
  is no "missing `snapshotId` on Back/Forward" case: it's always derived, never
  assumed from the eager payload. `getCityMeta(slug)`
  (`app/(scene)/[city]/page.tsx`) resolves it server-side; the cities index the
  switcher holds carries it client-side — reuse those.
- **Revisit only** if a city ever exposes multiple user-selectable snapshots;
  then `snapshotId` becomes real route state and earns a URL param.

## Root machine — the navigation lifecycle

> Superseded by **"Navigation boundary contract (DECIDED)"** above: the gate and
> `pendingSlug` now live in the dedicated `navigation` machine, not `root`. The
> sketch below is kept as the shape of that machine's `running` region (read
> `navigation` where it says `root`); `root` itself is reduced to a bootstrap
> that invokes `map`/`ui`/`worker`/`navigation`.

```ts
// components/scene/machine/root/context.ts  (SKETCH — additions)
export interface Context {
  cityRef: ActorRefFrom<typeof cityMachine> | null;
  // The slug the user is navigating to, set at NAV.START and cleared at
  // CITY.READY. Latest-wins: a re-click before the route loads just overwrites
  // it, so an aborted nav needs no special handling.
  pendingSlug: string | null;
}

// components/scene/machine/root/machine.ts  (SKETCH — running state)
running: {
  initial: "idle",
  invoke: [
    { src: "map", systemId: "map", input: {} },
    { src: "ui",  systemId: "ui",  input: {} },
  ],
  states: {
    idle: {
      on: {
        "NAV.START": {
          target: "navigating",
          actions: assign({ pendingSlug: ({ event }) => event.slug }),
          // map enters suppressed off the same NAV.START via system.get('map')
          // (or the click source sends both) — see source-of-truth rule.
        },
      },
    },
    navigating: {
      on: {
        // page mounted + framing resolved: stop the old city, spawn the new one
        "CITY.CHANGED": { actions: ["stopOldCity", "startNewCity"] },
        // newer click before the first finished: just restamp the target
        "NAV.START": { actions: assign({ pendingSlug: ({ event }) => event.slug }) },
        // the spawned city converged
        "CITY.READY": {
          target: "idle",
          actions: assign({ pendingSlug: null }),
        },
      },
    },
  },
}
```

## Open questions to settle before coding

1. `hexInspectInfo` — keep in `map` (spatial, dies with viewport) or move to
   `ui` alongside `selectedId` (it is a selection).

Resolved by the **Navigation boundary contract** above:

2. ~~Whether `CITY.READY` is emitted by `city` directly to `map` or relayed
   through `root`.~~ → The nav machine is the single fan-out point and broadcasts
   a generic `NAV.SETTLED`; children subscribe to that, not to a relay. Nav, not
   root, owns this — and it broadcasts rather than routing per-child.
3. ~~`NAV.START` fan-out — click site vs. root reading off `system.get`.~~ → A
   single generic broadcast (`NAV.STARTED`/`NAV.SETTLED`) the interested actors
   subscribe to; the click site and nav machine know no child internals (§3).

Decided (recorded above, kept here for traceability):

- **Gate placement** → nested as `ready.interactive ⇄ ready.suppressed`, not a
  parallel `freshness` region; the machine enforces the gate (interactions wired
  only on `interactive`), not the view.
- **Suppressed scope** → dim + interaction-gate, not a full input lock; the
  city-ingest events (`FIT_BOUNDS`/`SOURCE_LOADED`/`RESOLUTION_CHANGED`) keep
  flowing via the `ready` parent.
- **Old-city-visible vs blank** → keep dimmed; swap on new results; no data clear
  on `NAV.START` (only hover/select/inspect is cleared).
- **Loader rendering** → dim + loader are derived by the view from the
  `ready.suppressed` state, not machine actions/flags. The flash guard
  (~150ms delay so fast navigations stay silent) is therefore a **view** concern
  (delayed render / CSS), not a machine action.
- **Readiness-race deferral** → option D (reconcile on `ready`): one-field
  `pendingFitBounds` buffer + `applyCurrentStateToMap` entry; no event queue.

## Reminder — prefetch on navigation intent (per-machine, off `NAV.STARTED`)

Prefetch is **not** the nav machine's job (boundary contract §4). The eager
`NAV.STARTED { slug, snapshotId }` broadcast _announces the target_; each machine
prefetches **its own** resource off it, instead of the current reactive pattern
where each region waits until the city data is back and the component has
rendered, then fetches in a `useEffect`/Suspense on mount.

On `NAV.STARTED { slug }`, each owner warms its own resource:

- **`router.prefetch`** the `/[city]` route (RSC payload) so the page segment is
  warm by the time the click resolves.
- **Prime the React Query cache** for the client-fetched tiers keyed by the next
  slug — the boundaries GeoJSON (`/api/cities/{slug}/boundaries`,
  `use-city-boundaries`) and Browse points — via `queryClient.prefetchQuery`, so
  the new components hydrate against a warm cache instead of firing a cold fetch
  in `useEffect` after they mount.
- **Hand the next city's framing to the worker early** if it is cheaply known at
  click, so `requestHexes`/`requestAggregates` can start before the committed
  route event rather than after the sidebar renders.

Net effect: the dimmed window is spent _fetching_, not waiting-then-fetching, so
`NAV.SETTLED` lands sooner and the loader (delayed ~150ms) often never shows.
Trigger can even be earlier than click — on `pointerenter`/`focus` of the link
(hover-intent prefetch) — but `NAV.STARTED` is the guaranteed floor.
