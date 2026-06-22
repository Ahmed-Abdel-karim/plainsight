# Scene navigation & suppression architecture

The canonical reference for how the scene's XState actor system drives navigation
between cities and the suppression window that covers the route/data-load gap.
This describes the **implemented** design. The older
`map-machine-transition-gating.md` is superseded background (it captured the
exploration that led here).

## The actor system

One root actor system, mounted once in the root layout (`SceneProvider`), so it —
and its session children — survive all navigation, including the trip out to the
home picker.

```
root (coordinator, flat)
├── invoke map         (session)
├── invoke ui          (session)
├── invoke worker      (session, shared listings cache)
├── invoke navigation  (session, path tracker)
└── spawn   city       (dynamic, one per committed slug)
```

- **`map` / `ui` / `worker` / `navigation`** are _invoked_ — their lifetime is the
  session's, reachable via `system.get(SystemId.*)`.
- **`city`** is _spawned_ per committed navigation and stopped/replaced on the
  next one — a dynamic lifetime `invoke` can't express.

`SystemId` is global to the actor system, so every machine resolves the others by
id regardless of who spawned them.

## Roles in one line

> **navigation** owns _"where we're going and the window"_; **root** is the
> _coordinator_ that distributes; **each child** owns _"what that window means for
> me."_

## The navigation machine — a domain-agnostic path tracker

`navigation/` knows nothing about cities. It tracks **pathnames** only.

- **Inputs:** `NAV.INTENT { path }` (eager, predictive — fires before the route
  commits), `NAV.COMMIT { path }` (the route is now at `path`, from any source).
- **Outputs (to its parent, `root`, via `sendParent`):** `NAV.STARTED { path }`,
  `NAV.ENDED { path }`.
- **Context:** `currentPath`, `pendingPath`. **States:** `idle ⇄ navigating`.

```
state idle:
  on NAV.INTENT(path):
    if path != currentPath:                 # ignore intent to where we are
      pendingPath = path ; emit STARTED(path) ; -> navigating
  on NAV.COMMIT(path):
    if currentPath != null and path != currentPath:   # re-navigation
      emit STARTED(path) ; currentPath = path ; emit ENDED(path)
    else:                                             # initial route — silent
      currentPath = path

state navigating:
  on NAV.INTENT(path):
    if path != pendingPath:
      pendingPath = path ; emit STARTED(path)         # latest-wins re-click
  on NAV.COMMIT(path):
    currentPath = path ; pendingPath = null ; emit ENDED(path) ; -> idle
```

Behaviour:

| scenario                             | signals                                | result                                 |
| ------------------------------------ | -------------------------------------- | -------------------------------------- |
| cold start / initial route           | `COMMIT(A)`, `currentPath=null`        | **silent** (establish `currentPath`)   |
| city-switcher click                  | `INTENT(B)` → `COMMIT(B)`              | `STARTED(B)` … `ENDED(B)`              |
| re-click mid-flight                  | `INTENT(B)`, `INTENT(C)` → `COMMIT(C)` | `STARTED(B)`, `STARTED(C)`, `ENDED(C)` |
| Back/Forward, mid-session URL change | `COMMIT(B)` over established route     | `STARTED(B)`, `ENDED(B)`               |
| refresh / re-commit to current       | `COMMIT(A)` == current                 | no-op                                  |

**Why the initial route is silent:** it is not a transition — there is no old
city to suppress, and the deep-link seed (lens/selection) must land on an
_active_ ui. Suppressing on cold start would clear the seed. The map's own
first-load visual is its `lifecycle.loading` state, not suppression.

### Where the inputs come from

- **`NAV.COMMIT`** — `navigation/route-listener.tsx`, a `"use client"` island
  rendered inside `SceneProvider` that uses Next's **`usePathname`** hook and
  sends `NAV.COMMIT` on mount (cold start) and every change. `usePathname` reacts
  to `<Link>`, `router.push`, and Back/Forward alike — the App Router has no
  route-events API, so this hook is the documented way. (A `fromCallback` can't
  use hooks; patching `history.pushState` is undocumented and fragile, so we use
  the hook bridge.)
- **`NAV.INTENT`** — the city-switcher click (`useStartNav` → `city-link.tsx`),
  the only eager source.

`syncSceneUrl` writes search params via `history.replaceState`, which does **not**
change the pathname, so `usePathname` never observes it — no feedback loop.

## The coordinator (root) — flat, mechanical

Root holds no gate and no pending state; it is a flat machine (top-level `invoke`

- `on`) whose only context is `cityRef`. It translates lifecycle inputs into the
  shared suppression pair and owns the city lifecycle.

```
on NAV.STARTED:            send SUSPEND to [map, ui]        # bare, untyped fan-out
on CITY.CHANGED(framing,filter): stopOldCity ; startNewCity(framing, filter)
on CITY.READY:             send RESUME  to [map, ui]
on CITY.FAILED:            send RESUME  to [map, ui]
on URL.SYNC:               syncUrl
```

Note the split: **suppression** begins on `NAV.STARTED` (route-driven) but
**resume** is **data-driven** — it waits for `CITY.READY`/`CITY.FAILED`, not for
`NAV.ENDED`. Root ignores `NAV.ENDED`; the suppression window deliberately
outlasts the route commit until the new city's data is in. `CITY.CHANGED`
(carrying server-resolved `framing` + URL `filter`) is the city-spawn trigger,
dispatched by the page island `scene-url-loader.tsx`.

## The suppression contract — one shared bare pair

Root broadcasts two generic, payload-free events; each child interprets them in
its own vocabulary. Children never learn navigation specifics.

| event     | map                                                    | ui                                             |
| --------- | ------------------------------------------------------ | ---------------------------------------------- |
| `SUSPEND` | `interaction → suspended` (clears highlights on entry) | `active → navigating` (clears selection/hover) |
| `RESUME`  | `interaction → interactive`                            | `navigating → active`                          |

`RESUME` collapses both `CITY.READY` and `CITY.FAILED` — either way the controls
re-enable; the failure _toast_ is a separate `city.error` emit.

## Map — two parallel regions

Lifecycle and suppression are **independent** concerns, so the map is a parallel
machine:

```
map (parallel):
  region lifecycle:   loading → ready → error    # instance, camera, data ingest
  region interaction: interactive ⇄ suspended    # the pointer-interaction gate
```

- **lifecycle** owns the MapLibre instance + camera/data ingest
  (`MAP.FIT_BOUNDS`/`SOURCE_LOADED`/`RESOLUTION_CHANGED`). It keeps flowing
  regardless of suppression, so "fly to the new city while suppressed" falls out
  with no reconcile-on-resume. Entry to `ready` runs `applyCurrentStateToMap`
  (reconcile camera + selection/hover from durable truth) — the readiness-race
  buffer (`pendingFitBounds`) is applied here.
- **interaction** owns only the gate: pointer events (`SELECT`/`HOVER`/
  `HEX_INSPECT`) are wired **only** in `interactive`, so the gate is structural,
  not guard-based. `suspended` does nothing but clear the old highlights on entry
  and wait for `RESUME`.

Why parallel beats nesting: it represents `loading × suspended` **natively**, so
`SUSPEND` arriving while still `loading` needs no buffer or guard — the
interaction region just moves, and when `MAP.READY` lands the combined state is
`ready + suspended`. `MAP.UNMOUNTED` resets the lifecycle region only; the
interaction region keeps its place, so unmounting mid-nav and returning is still
correctly suspended. The view derives its dim/scrim from
`matches({ interaction: "suspended" })`.

## UI — a small store + a gate

`active ⇄ navigating` on `SUSPEND`/`RESUME`. Holds the durable cross-navigation
state (`lens`, selection, hover) that the map reconciles from on `ready` entry.
Its one cross-actor effect is `forwardLensToCity`. On `SUSPEND` it clears
selection/hover (lens persists).

## City — decoupled, notifies the coordinator only

`city/` is spawned with `input: { framing, filter }`, runs its own data lifecycle
(`deciding → browse | analyse(loading/ready/error)`), and on convergence/failure
calls `notifyCityReady` / `notifyCityFailed` which send **only to `SystemId.ROOT`**.
Root translates those to `RESUME` for map + ui. City references no other machine.

## Business assumption — one snapshot per city

`snapshotId` is **derived from the slug**, never carried in the URL. Reconciliation
stays keyed on `pathname` (slug only); `framing` (server-resolved via
`getCityMeta`) carries `snapshotId` into the spawn. Revisit only if a city ever
exposes multiple user-selectable snapshots — then it becomes real route state and
earns a URL param.

## End-to-end flows

```
city-switcher click:
  click → useStartNav → NAV.INTENT(/B) → navigation → NAV.STARTED → root → SUSPEND(map,ui)
  route commits → RouteListener → NAV.COMMIT(/B) → navigation → NAV.ENDED (root ignores)
  page resolves → scene-url-loader → CITY.CHANGED(framingB) → root: stop A, spawn B
  B converges → CITY.READY → root → RESUME(map,ui)

Back/Forward / deep link (no click):
  route changes → RouteListener → NAV.COMMIT(/B) → STARTED → SUSPEND … spawn … CITY.READY → RESUME

cold start / hard refresh:
  RouteListener → NAV.COMMIT(/B), currentPath=null → silent (no SUSPEND)
  scene-url-loader seeds lens/selection on the active ui, then CITY.CHANGED → spawn → CITY.READY
```

## Event reference

| event                              | from → to                  | meaning                                |
| ---------------------------------- | -------------------------- | -------------------------------------- |
| `NAV.INTENT { path }`              | city-link → navigation     | eager click                            |
| `NAV.COMMIT { path }`              | RouteListener → navigation | route committed (any source)           |
| `NAV.STARTED { path }`             | navigation → root          | open the suppression window            |
| `NAV.ENDED { path }`               | navigation → root          | route settled (root ignores)           |
| `SUSPEND`                          | root → map, ui             | enter the suppressed/navigating window |
| `RESUME`                           | root → map, ui             | leave it (data ready or failed)        |
| `CITY.CHANGED { framing, filter }` | page island → root         | spawn/replace the city                 |
| `CITY.READY` / `CITY.FAILED`       | city → root                | data converged / terminally failed     |
| `URL.SYNC`                         | view → root                | mirror settled selection to the URL    |

## Tests

- `navigation/navigation.test.ts` — the path tracker in isolation (a harness
  records `STARTED`/`ENDED`): initial-silent, eager open/close, Back/Forward
  suppress, latest-wins, no-ops.
- `state/machines/__tests__/system.test.ts` — connected coordinator wiring: spawn
  - worker load, converged/filter fan-out, `SUSPEND`/`RESUME` fan-out, failure
    recovery.
- `state/machines/map/{transition-gating,lifecycle}.test.ts` — the gate and the
  instance lifecycle over the connected system.
