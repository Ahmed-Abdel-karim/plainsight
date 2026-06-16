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
  trigger that beats the route-pending window).
- the new page mounts and dispatches `CITY.CHANGED` with framing → root spawns a
  fresh `city`.
- `city` emits `CITY.READY` once the worker results stamp in (and the target
  bbox is known) → root returns to `idle`, map returns to `ready.interactive`.

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
last-wins). `reconcileToReady` on `ready` entry flies to it and re-applies
selection/hover, then `clearPendingFitBounds` drops the buffer. Idempotent, no
stale storm, and the `useRef` gate + fly-guard are deleted. Cost: `reconcileToReady`
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
    bufferFitBounds: () => {
      /* assign pendingFitBounds = latest bbox (last-wins) */
    },
    clearPendingFitBounds: () => {
      /* assign pendingFitBounds: null */
    },
    reconcileToReady: () => {
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
        // by `reconcileToReady` on entry to `ready`. SELECT/HOVER not buffered
        // (truth lives in `ui`); HEX_INSPECT can't occur before paint.
        "MAP.FIT_BOUNDS": { actions: "bufferFitBounds" },
      },
    },

    ready: {
      initial: "interactive",
      // sync the imperative layer to durable truth once, then drop the buffer
      entry: ["reconcileToReady", "clearPendingFitBounds"],
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

## Root machine — the navigation lifecycle

Root gains the `navigating` state and `pendingSlug`; this is where the
route-pending window is owned. Sketch of the additions to today's skeleton:

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
        "CITY.CHANGED": { actions: ["stopPreviousCity", "spawnCity"] },
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
2. Whether `CITY.READY` is emitted by `city` directly to `map`
   (`sendTo`/`system.get('map')`) or relayed through `root`. Prefer direct via
   the receptionist to avoid root becoming a router.
3. **`NAV.START` fan-out.** Does the city-picker `<Link>` send `NAV.START` to
   both root and map, or only to root with the map reading it off
   `system.get('map')` from a root action? Prefer a single dispatch the
   interested actors subscribe to, over the click site knowing every consumer.

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
  `pendingFitBounds` buffer + `reconcileToReady` entry; no event queue.

## Reminder — prefetch on navigation intent (TODO when wiring `NAV.START`)

When `NAV.START` fires we already know the target slug (and its `CityMeta`) from
the link's `href`. Use that moment to **warm the data proactively** instead of
the current reactive pattern, where each region waits until the city data is back
and the component has rendered, then fetches in a `useEffect`/Suspense on mount.

On `NAV.START { slug }` we should:

- **`router.prefetch`** the `/[city]` route (RSC payload) so the page segment is
  warm by the time the click resolves.
- **Prime the React Query cache** for the client-fetched tiers keyed by the next
  slug — the boundaries GeoJSON (`/api/cities/{slug}/boundaries`,
  `use-city-boundaries`) and Browse points — via `queryClient.prefetchQuery`, so
  the new components hydrate against a warm cache instead of firing a cold fetch
  in `useEffect` after they mount.
- **Hand the next city's framing to the worker early** if it is cheaply known at
  click, so `requestHexes`/`requestAggregates` can start before `CITY.CHANGED`
  rather than after the sidebar renders.

Net effect: the dimmed window is spent _fetching_, not waiting-then-fetching, so
`CITY.READY` lands sooner and the loader (delayed ~150ms) often never shows.
Trigger can even be earlier than click — on `pointerenter`/`focus` of the link
(hover-intent prefetch) — but `NAV.START` is the guaranteed floor.
