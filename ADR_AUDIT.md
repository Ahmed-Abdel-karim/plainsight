# Architecture Decision Audit

> Working record for auditing the decisions represented by ADRs 0001–0007. This
> file is diagnostic and mutable; accepted ADRs remain the final, immutable
> decision history.

## Purpose

Review every architecture decision against the running implementation, identify
leakage and mismatches, fix confirmed issues, and only then finalize the ADR set
from the corrected system.

## Review Method

For each decision:

1. Ask one concrete architecture question.
2. Trace the current implementation and state what it actually does.
3. Compare the current behavior with the intended behavior.
4. Discuss the difference.
5. Record a finding under **Confirmed Issues** only after it is explicitly
   confirmed as an issue.
6. Fix confirmed issues before drafting the corresponding ADR.

Implementation observations that still need a product or architecture decision
stay under **Open Discussion**. They are not defects merely because they differ
from an initial proposal.

## Review Basis

The backend review uses these current practices as its baseline:

- Next.js recommends one dedicated, server-only Data Access Layer (DAL) for new
  applications and direct source access from Server Components.
- Route Handlers are public transport endpoints, not an internal data-access
  hop for Server Components.
- Next.js does not prescribe folder names; the project must choose and enforce a
  coherent dependency direction.
- Community feature-based guidance favors unidirectional layers, isolated
  feature APIs, and request/response validation at IO boundaries.
- Public immutable assets should be delivered directly by object storage/CDN,
  not proxied through application functions.

References:

- <https://nextjs.org/docs/app/guides/data-security>
- <https://nextjs.org/docs/app/guides/backend-for-frontend>
- <https://nextjs.org/docs/app/getting-started/project-structure>
- <https://nextjs.org/docs/app/api-reference/directives/use-cache>
- <https://nextjs.org/docs/app/api-reference/functions/cacheLife>
- <https://vercel.com/docs/functions/limitations>
- <https://vercel.com/docs/vercel-blob>
- <https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md>
- <https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md>

## Decision Queue

- **0001 — Feature-based architecture:** feature ownership, public APIs, and
  downward-only dependency boundaries.
- **0002 — XState scene orchestration:** actor ownership, events, lifetimes, and
  separation from local, URL, and remote state.
- **0003 — Immutable city snapshots:** versioning, external object storage, and
  the no-database/no-persistent-backend boundary.
- **0004 — Tiered snapshot delivery:** materialized server summaries and
  complete client detail.
- **0005 — Analytical compute:** interactive computation in a Web Worker.
- **0006 — Map lifecycle:** one persistent MapLibre map in the scene route-group
  layout.
- **0007 — Theme ownership:** client-side `next-themes` rather than server-cookie
  theming.

## Open Discussion

### 0001 — Feature-Based Architecture

#### Q0001.1 — Which layer owns shared domain vocabulary?

**Question:** Is `lib/` truly the bottom layer, with no dependency on `data/`, or
is `data/contract.ts` a lower shared-domain module that `lib/` may depend on?

**Current implementation:** The documented dependency diagram says
`data/ → lib/` and `lib/ → (nothing)`. ESLint nevertheless exempts
`data/contract.ts` and `data/types.ts` from the `lib → data` restriction. This is
not only a type dependency: `lib/filters/aggregate.ts`,
`lib/filters/normalize.ts`, and `lib/search-params.ts` import runtime constants
such as `ROOM_TYPES`, `MIN_LISTING_FLOOR`, and
`MULTI_LISTING_THRESHOLD` from `data/contract.ts`.

**Intent:** `data/` remains the IO and snapshot layer. Shared domain vocabulary
used by pure computation belongs below it in `lib/domain/`; `lib/` must not
depend on `data/`.

**Status:** Confirmed as issue **C-0001**.

#### Q0001.2 — Which layer owns city-data HTTP delivery?

**Question:** Should the code that maps city tiers to snapshot files and serves
them over HTTP belong to the `data/` IO layer?

**Current implementation:** `app/api/cities/**` delegates to
`lib/data-endpoint.ts`. That `lib/` module is application-specific: it hardcodes
the `data/cities` store, city-tier filenames, the exposed tier allowlist, and
HTTP cache behavior. `data/repository/static-json.ts` separately knows the same
filesystem location, splitting ownership of the snapshot store between `data/`
and the nominal bottom-layer `lib/`.

**Intent:** Public immutable client tiers are delivered directly from object
storage/CDN. The server-only DAL owns the remaining snapshot access; the
application-specific delivery module does not belong in `lib/`.

**Status:** Confirmed as issues **C-0002** and **C-0004**.

### 0002 — XState Scene Orchestration

#### Q0002.1 — Does The URL Own Live Scene State?

**Question:** Is navigable scene state owned live by the URL, or owned by the
actors and serialized to the URL for entry and sharing?

**Current implementation:** The `ui` and `city` actors own the live lens,
listing, filter, and neighbourhood state. `SceneUrlLoader` seeds them from the
query string when a city route mounts; `UrlWriteSync` subsequently mirrors actor
state with `replaceState`. Same-route query changes and browser history are not
an ongoing input to the actors.

**Intent:** Keep the actor-owned model. Users normally enter through a URL and
need the resulting state reflected in a link they can share; Back/Forward does
not need to replay individual lens or filter changes.

**Status:** Matches intent; no issue recorded.

#### Q0002.2 — What Is The Analytics Worker Lifetime?

**Question:** Should the analytics worker be recreated per city, or remain alive
for the scene session and retain analytics for previously visited cities?

**Current implementation:** The root invokes one session-lifetime worker. A
worker-local TanStack Query client retains each visited snapshot's parsed
analytics and process results indefinitely, so revisiting a city avoids another
fetch. The separate page-level query client similarly retains public points and
boundaries.

**Intent:** Keep both caches session-persistent. The fixed worker should retain
the important analytical data and make revisiting a city immediate; the bounded
launch-city set makes the memory tradeoff acceptable.

**Status:** Matches intent; no issue recorded.

#### Q0002.3 — Are Superseded Worker Errors Dropped?

**Question:** Should replies from superseded city work, including failures, be
ignored so only the latest relevant action can affect the active city?

**Current implementation:** Worker process slots are latest-wins per process
type. Pending requests replace older pending requests, and successful replies
carry `slug` and `snapshotId` so the city rejects stale results. Process-error
responses also leave the worker thread with that identity, but the worker
machine removes it when creating `WORKER.PROCESS_ERROR` and sends the unstamped
error to whichever city is currently registered.

**Intent:** Every result or error from a superseded city must be ignored. An
old-city failure must not surface against the current city merely because no
new request of that process type was pending when it arrived.

**Status:** Confirmed as issue **C-0008**.

#### Q0002.4 — Does Every City Navigation Enter The Transition Gate?

**Question:** Should browser Back/Forward transitions between cities suppress
the outgoing city's map and UI until the incoming city is ready, just like a
city-switcher transition?

**Current implementation:** `CityLink` emits `NAV.START` before its Next.js
navigation, which moves root, map, and UI into their guarded navigation states.
Browser history navigation bypasses that component. The remounted
`SceneUrlLoader` emits only `CITY.CHANGED`, which replaces the city actor while
root remains `idle`, map remains interactive, and UI is not reset or suppressed.

**Intent:** Every transition between two scene cities must use the same guarded
window, regardless of whether it originates from the switcher or browser
history. First entry into the scene does not require outgoing-city suppression.

**Status:** Confirmed as issue **C-0009**.

#### Q0002.5 — What Does City Readiness Mean?

**Question:** Should navigation suppression end when the active lens's raw data
is available, or only after its first visible derived results are ready?

**Current implementation:** Browse emits `CITY.READY` after its points tier
loads. Analyse emits it after analytics loads and parses, then requests initial
hexes and aggregates. Navigation suppression therefore ends while Analyse may
still show loading placeholders for those derived results.

**Intent:** Keep the early-release boundary. A city is ready when the active
lens's source data is available; initial derived results may complete visibly
behind their normal loading states rather than extending the whole-city
transition overlay.

**Status:** Matches intent; no issue recorded.

#### Q0002.6 — How Do Sibling Actors Communicate?

**Question:** Should cross-actor communication be relayed through root, or may
bounded sibling actors send explicit typed events directly to one another?

**Current implementation:** Root owns actor lifetimes and shared navigation.
Map, UI, city, and worker use the XState system registry to exchange direct
events for their specific collaborations, avoiding a root-level event relay for
every interaction.

**Intent:** Keep direct event-based actor communication. Root coordinates
system-wide lifecycle rather than acting as a generic message bus.

**Documentation requirement:** The architecture documentation must include an
actor topology diagram showing root, map, UI, city, and worker; their lifetimes;
and the direct event paths between them. The diagram must make the non-central
communication model explicit to repository reviewers.

**Status:** Matches intent; no implementation issue recorded. Documentation
requirement remains open.

#### Q0002.7 — Does Terminal Loading Failure End Navigation?

**Question:** When the incoming city's active lens data fails to load, should
the system leave its navigation window and expose a recoverable failure state?

**Current implementation:** `NAV.START` moves root to `navigating`, map to
`suppressed`, and UI to `navigating`. Successful loading emits `CITY.READY` to
release all three. Terminal Browse or Analyse loading failure moves only the
city actor to `error` and emits a toast signal; root, map, and UI receive no
terminal event and remain in their navigation states indefinitely.

**Intent:** Every navigation window must terminate in either readiness or a
recoverable failure. A failed city must not leave the persistent scene spinner,
map gate, and UI gate active indefinitely.

**Status:** Confirmed as issue **C-0010**.

#### Q0002.8 — Who Owns Imperative MapLibre Synchronization?

**Question:** Must every MapLibre mutation live in the map actor, or may a React
adapter reconcile global actor state where synchronization depends on a mounted
source or layer lifecycle?

**Current implementation:** Actors own selection, hover, map readiness, and
interaction gating. The map machine performs imperative interaction effects,
while `usePointsFeatureState` observes the global actor state and reconciles it
when the points source is mounted or reloaded. Declarative react-map-gl APIs are
used where they model the component lifecycle completely; imperative MapLibre
calls cover the remaining integration gaps.

**Intent:** Keep global interaction intent in the actor system and keep
component/source-lifecycle subscriptions colocated with the React map layer.
MapLibre feature state is a rendered projection of actor state, not a second
source of truth. Prefer react-map-gl's declarative integration whenever it
adequately represents the required behavior.

**Documentation requirement:** Document the global-state versus
component-lifecycle boundary and identify React map hooks as adapters that
reconcile actor state with MapLibre's incomplete declarative surface.

**Status:** Matches intent; no implementation issue recorded. Documentation
requirement remains open.

#### Q0002.9 — Who Owns Browse Loading-Error Notifications?

**Question:** Should failure of the active Browse points load produce one
city-lifecycle notification, or independent notifications from TanStack Query
and the city actor?

**Current implementation:** `loadBrowsePoints` uses the page-level QueryClient.
When the request exhausts its retries, `QueryCache.onError` emits a
`browse-points` toast. The rejected city invoke also emits `city.error`, and
`SceneNotifications` produces a separate city-load toast. The two paths use
different notification keys and are not deduplicated. Analyse loading failures
use only the city path; optional boundaries failures use only the query path.

**Intent:** The city lifecycle owns user-facing failures for the active lens
load. The query cache may own optional or background tier failures such as
boundaries. One failed operation should produce one notification.

**Status:** Confirmed as issue **C-0011**.

### 0003 — Immutable City Snapshots

#### Q0003.1 — Is External Object Storage Required Now?

**Question:** Must the current portfolio deployment publish snapshots to an
external object store, or may it use Vercel's static CDN with an external store
reserved as a growth path?

**Current implementation:** Approximately 68 MB of immutable browser tiers are
committed under `public/city-assets` and served from the same-origin
`/city-assets` path by default. `NEXT_PUBLIC_CITY_ASSET_BASE_URL` can redirect
the unchanged versioned paths to an external CDN or object store later.

**Intent:** Use Vercel static delivery for the fixed four-city portfolio. Add an
external object store only in a later version or when dataset growth makes the
deployment tradeoff worthwhile.

**Documentation requirement:** ADR 0003 must describe Vercel static CDN as the
current storage boundary and external object storage as an enhancement path,
rather than claiming external storage is already required.

**Status:** Matches implementation; no implementation issue recorded.
Documentation correction remains open.

### 0004 — Tiered Snapshot Delivery

#### Q0004.1 — Do Server Summaries Hand Over To Client Scope?

**Question:** After the initial server-rendered city summary, should the market
header and Analyse cards follow the active client-side neighbourhood and
filters?

**Current implementation:** The city page always passes a city-wide `scope` to
`SceneView`. Browse derives its list and dots from the city actor's active
scope, but `ListingCount` continues reading the server city count. Analyse has a
client recomputation result, yet `AnalysisCards` continues choosing the
city-wide server default whenever room and price filters are default, without
considering the active neighbourhood.

**Intent:** The server tier provides the useful initial city-wide render. Once
client scope or filters change, every visible region must hand over to the same
actor-derived active scope so the header, cards, list, and map remain coherent.

**Status:** Confirmed as incomplete work **C-0012**.

#### Q0004.2 — Is The Market Panel Executed Twice On Mobile?

**Question:** Should desktop and mobile share one live market-panel instance, or
only reuse the same component definition across two mounted trees?

**Current implementation:** `SceneView` renders `MarketPanelContent` inside the
desktop aside and again inside the mobile drawer. The desktop aside is hidden on
mobile with CSS but remains mounted. When the drawer opens, a second panel tree
subscribes to the same actors and derives the same Browse data. React Query
deduplicates network access, but filtering, sorting, totals, local state, and
subscriptions can execute twice over London's roughly 62,000 listings.

**Intent:** Responsive presentation must not duplicate the heavy live feature
tree. Desktop and mobile may use different shells, but only the active panel
instance should perform Browse derivation and interactive subscriptions.

**Status:** Confirmed as incomplete work **C-0013**.

### 0005 — Analytical Compute

Not started.

### 0006 — Persistent Map Lifecycle

Not started.

### 0007 — Theme Ownership

Not started.

## Confirmed Issues

### C-0001 — Domain Vocabulary Breaks The Bottom-Layer Boundary

**Decision:** Keep `lib/` as the bottom application layer and `data/` as the
IO/snapshot layer.

**Leakage:** Pure modules under `lib/` import domain types and runtime policy
constants from `data/contract.ts` and types from `data/types.ts`. ESLint contains
an exception that permits this reverse dependency, so the effective layer graph
does not match the documented `data → lib` direction.

**Required correction:** Move shared domain vocabulary needed by pure
computation into `lib/domain/`, update consumers, and remove the `lib → data`
ESLint exception. Keep snapshot/repository-specific contracts in `data/`. Move
feature presentation/state types (`CityData`, `SortKey`, `MapCityPayload`) out
of `data/types.ts`, and move listing-count display formatting out of the DAL.

**Status:** Resolved as **R-0004**. The original file-move prescription was
superseded: the constants are pure domain values, so the boundary was reframed
rather than relocated (no `lib/domain/` move).

### C-0002 — Large Public Assets Are Proxied Through Vercel Functions — Resolved

**Decision:** Browser-facing immutable assets must bypass application functions
and be fetched directly from public object storage/CDN.

**Leakage:** `/api/cities/{slug}/{tier}` reads and returns committed files from a
Route Handler. London analytics is about 16.2 MB and points about 32.6 MB;
Berlin points is about 4.9 MB. These exceed Vercel Functions' documented 4.5 MB
request/response payload limit. `outputFileTracingIncludes` also bundles the
entire 72 MB snapshot directory into the delivery function.

**Required correction:** Publish `analytics`, `points`, and `boundaries` as
public immutable assets, add a configurable asset base URL, fetch those tiers
directly in the browser, and remove their Route Handler proxy and tracing
configuration. Keep small server-facing metadata and aggregates behind the DAL.

**Status:** **Resolved as R-0003.**

### C-0003 — Snapshot Identity Is Mutable And Unversioned

**Decision:** Every published city snapshot has an immutable identity that is
present in its storage path and cache key. A small manifest selects the active
snapshot.

**Leakage:** Files use mutable names such as `london-analytics.json`. Updating a
snapshot replaces the logical resource; only the deployment and ETag change.
Repository reads and `"use cache"` keys accept only a city slug, so snapshot
identity is implicit.

**Required correction:** Introduce a versioned layout such as
`snapshots/{slug}/{snapshotId}/{tier}` plus an active-snapshot manifest. Pass the
snapshot ID through repository and client-asset URL construction. Never
overwrite a published snapshot path.

**Status:** Resolved as **R-0002**.

### C-0004 — Snapshot Storage Ownership Is Split Across Layers — Resolved

**Decision:** `data/` is the server-only DAL and sole owner of snapshot-source
adapters. `lib/` remains unaware of application storage and HTTP delivery.

**Leakage:** `data/repository/static-json.ts` and `lib/data-endpoint.ts` both
hardcode the snapshot directory and naming scheme. The latter also owns the tier
allowlist, HTTP cache policy, ETag hashing, and an in-memory cache of complete
file buffers.

**Required correction:** Do not relocate the temporary proxy mechanically.
Implement storage access once behind the repository adapter, then delete
`lib/data-endpoint.ts` when direct public delivery replaces it. Let object
storage/CDN own caching for heavy assets.

**Status:** **Resolved as R-0003.**

### C-0005 — The Data Public API Mixes Server And Client Surfaces

**Decision:** The DAL has an explicitly server-only public entrypoint. Client
code imports only pure domain or feature-owned types and utilities.

**Leakage:** `data/index.ts` re-exports server-only loaders, selectors, runtime
constants, and client-consumed types from one barrel. A Client Component imports
`CityData` from that mixed barrel without a type-only import, making the
server/client cut depend on TypeScript import elision.

**Required correction:** Make the DAL entrypoint server-only and keep it free of
client exports. Expose shared domain vocabulary from `lib/domain/`; keep pure
snapshot contracts separately addressable only where needed. Add an ESLint
boundary preventing Client Components from importing the DAL entrypoint.

**Status:** Resolved as **R-0005**.

### C-0006 — Snapshot Parsing Is Unvalidated And Hides Corruption

**Decision:** Snapshot contracts are validated at the publishing/build boundary,
and runtime reads distinguish absence from corruption or infrastructure errors.

**Leakage:** The static adapter uses `JSON.parse(raw) as T` without runtime
validation. A broad `catch` converts malformed JSON, permissions failures, and
missing files into the same `null` result, which can surface as a false 404 or
empty dataset.

**Required correction:** Add schemas and validate every produced snapshot in
the publishing or CI workflow. At runtime, catch only expected not-found errors;
allow invalid JSON and unexpected IO failures to fail visibly. Cover valid,
missing, and malformed inputs with adapter contract tests.

**Status:** Resolved as **R-0006**. Runtime error semantics fixed; build-time
schema validation intentionally deferred (snapshots are frozen artifacts with no
live pipeline).

### C-0007 — Obsolete Backend Surface Remains Exposed

**Decision:** Every DAL method, Route Handler, and deployment include has a
current consumer or a documented boundary purpose.

**Leakage:** `getFilterBounds` and related selector exports have no production
consumers and expand the DAL surface without a documented boundary purpose.

**Required correction:** After the new snapshot delivery and layer split land,
remove unused endpoints, repository methods, loaders, selectors, exports, and
output tracing. Verify the reduced public and deployment surface with tests and
a production build.

**Status:** Resolved as **R-0007**.

### C-0008 — Stale Worker Process Errors Leak Into The Active City

**Decision:** Worker coordination is latest-relevant-request-wins. Every worker
reply is associated with its originating city snapshot, and replies from a
superseded city cannot affect the active city.

**Leakage:** Process success replies retain `slug` and `snapshotId` through the
worker machine and are guarded by the city actor. Process failures contain the
same identity at the worker boundary, but `deliverProcess` drops it and emits an
unstamped `WORKER.PROCESS_ERROR` to the currently registered city. A late
failure from the previous city can therefore produce a notification in the new
city.

**Required correction:** Preserve snapshot identity on process-error events and
apply the same current-city guard used for successful results and load replies.
Add a machine regression covering navigation while old-city processing is in
flight.

**Status:** Resolved as **R-0010**.

### C-0009 — Browser History Bypasses City Transition Gating

**Decision:** The outgoing city becomes non-interactive and visually suppressed
during every in-scene city transition until the incoming city reaches the
agreed readiness point.

**Leakage:** The guarded window depends on a click-time `NAV.START` emitted only
by `CityLink`. Back/Forward navigation remounts the route and emits
`CITY.CHANGED` without first transitioning root, map, and UI into their
navigation states. The old city's presentation can therefore remain interactive
while the replacement city loads.

**Required correction:** Make the actor system recognize every in-scene city
replacement as navigation while preserving the special case of first scene
entry. Cover switcher, Back, Forward, and rapid consecutive navigation with
machine and browser regressions.

**Status:** Resolved as **R-0008**.

### C-0010 — City Load Failure Leaves Navigation Permanently Gated

**Decision:** An in-scene city transition has explicit successful and failed
terminal outcomes. Both outcomes end the temporary navigation gate and leave
the user with an operable recovery path.

**Leakage:** The city actor's Browse and Analyse error states only emit
`city.error` for the toast layer. Unlike the ready states, they send no terminal
event to root, map, or UI. After a failed in-scene transition, root remains
`navigating`, map remains `suppressed`, UI keeps dropping interaction events,
and the pending-city spinner never clears.

**Required correction:** Define a city-load-failed lifecycle event and a
coherent recovery state or rollback behavior across root, map, and UI. Verify a
failed Browse asset and a failed Analyse asset during city switching, including
the ability to select another city afterward.

**Status:** Resolved as **R-0009**.

### C-0011 — Browse Load Failure Produces Competing Notifications

**Decision:** Error presentation has one owner per operation. Active lens-load
failures belong to the city lifecycle; optional and background query failures
may be presented by the shared query layer.

**Leakage:** A terminal `browse-points` query failure invokes the global
`QueryCache.onError` notification and rejects the city machine's
`loadBrowsePoints` actor, which emits a second notification through
`SceneNotifications`. Different toast keys prevent deduplication and give one
failure two competing messages.

**Required correction:** Remove the active Browse load from one notification
path while preserving city error-state orchestration and the query-layer
handling of optional boundaries failures. Add a user-visible regression that
asserts one notification for one failed operation.

**Status:** Resolved as **R-0011**.

### C-0012 — Server Summary Does Not Fully Hand Over To Client Scope

**Decision:** Pre-baked server summaries provide the initial city-wide view;
after hydration, active scope and filter changes produce one coherent client
view across the header, Analyse cards, Browse list, and map.

**Leakage:** The route supplies only a city-wide server scope. Browse follows
the city actor's neighbourhood, while `ListingCount` remains server-scoped and
`AnalysisCards` prefers the city-wide server aggregate whenever room and price
filters are default. Selecting a neighbourhood can therefore narrow the list
and map while leaving the header and cards city-wide.

**Required correction:** Complete the server-to-client handover for listing
count and aggregates. Preserve the server-rendered default, but select
actor-derived values whenever neighbourhood or filters make the active view
non-default. Cover a normal neighbourhood selection across all visible regions.

### C-0013 — Responsive Shells Duplicate The Live Market Panel

**Decision:** Desktop and mobile may present the market panel differently, but
responsive composition must not execute duplicate heavy feature trees for one
viewport.

**Leakage:** The CSS-hidden desktop aside remains mounted on mobile. Opening the
mobile drawer mounts another `MarketPanelContent`, duplicating actor
subscriptions, local controls, and Browse filtering and sorting. The asset fetch
is shared, but CPU and React work over the large listing collection is repeated.

**Required correction:** Restructure the responsive boundary so only the active
presentation mounts the heavy panel tree, while preserving shared component
code, hydration correctness, accessibility, and desktop/mobile behavior. Verify
that one Browse derivation/list tree is live at each viewport size.

## Fix Order

1. ~~**C-0003:** establish immutable snapshot identity and the manifest
   contract.~~ Resolved as **R-0002**.
2. ~~**C-0002 + C-0004:** switch heavy tiers to direct public delivery and remove
   the Function proxy/storage duplication.~~ Resolved as **R-0003**.
3. ~~**C-0001:** restore the `data → lib` dependency direction and feature
   ownership.~~ Resolved as **R-0004** (reframed the boundary, no file move).
4. ~~**C-0005:** split the server DAL API from client-safe imports and enforce
   it.~~ Resolved as **R-0005**.
5. ~~**C-0006:** add publishing validation and correct runtime error
   semantics.~~ Resolved as **R-0006** (runtime semantics fixed; build
   validation intentionally deferred — no live pipeline).
6. ~~**C-0007:** remove obsolete backend surface and deployment
   configuration.~~ Resolved as **R-0007**.
7. ~~**C-0008:** stamp and guard worker process errors by snapshot
   identity.~~ Resolved as **R-0010**.
8. ~~**C-0009:** route browser history transitions through the city
   gating.~~ Resolved as **R-0008**.
9. ~~**C-0010:** define a terminal city-load-failed lifecycle that lifts the
   gate.~~ Resolved as **R-0009**.
10. ~~**C-0011:** give the active Browse load a single notification owner.~~
    Resolved as **R-0011**.

## Resolved Issues

### R-0001 — Cold Browse Deep Links Eagerly Loaded Analyse Data

**Original leakage:** A city actor always entered its analytics-loading path, so
opening `?lens=browse` fetched the full Analyse tier before the selected lens
could affect orchestration.

**Resolution:** The city machine now chooses a `browse` or `analyse` leg from
the URL-seeded UI lens. Browse loads only its points query; Analyse owns the
worker analytics load and computations. Runtime lens changes route between the
legs, and returning to Analyse reuses already-loaded analytics where possible.
The missing per-leg error states were restored so the new topology initializes
correctly.

**Verification:** The connected-machine regression asserts that a Browse start
sends no worker load or compute command. A production-build Playwright test
opens `/london?lens=browse`, waits for the points response, and asserts that no
`analytics.json` request occurred. Full Vitest, TypeScript, ESLint,
formatting, and the real-browser scene verifier pass.

### R-0002 — Snapshot Identity Is Explicit And Immutable

**Original leakage:** Active city files used mutable, unversioned names, and
repository, browser, and worker caches identified data by city slug alone.

**Resolution:** `data/snapshots/manifest.json` now selects one immutable
`snapshotId` per city. Server tiers live under
`data/snapshots/{slug}/{snapshotId}/`; public tiers use the equivalent
`city-assets/{slug}/{snapshotId}/` path. The ID is part of metadata, repository
calls and `"use cache"` keys, React Query keys, worker load/process keys,
navigation prefetches, and tier URLs. The current snapshot is `2025-09`;
publishing a replacement requires a new path and a manifest update.

**Verification:** All 16 moved heavy tiers are byte-identical to their original
files. Full Vitest, TypeScript, ESLint, formatting, and production build pass.
The focused production Playwright Browse test passes against the versioned
points asset, and the real-browser Analyse verifier loads the versioned
analytics and boundaries assets.

### R-0003 — Public Snapshot Tiers Bypass Application Functions

**Original leakage:** Large browser-facing tiers were read from the snapshot
directory and returned by Next.js Route Handlers. This duplicated storage
knowledge in `lib/data-endpoint.ts`, bundled the full snapshot directory into
Functions, and put responses above Vercel's Function payload limit.

**Resolution:** `analytics.json`, `points.geojson`, and `boundaries.geojson` now
live under immutable public snapshot paths. Browser consumers build their URLs
from `NEXT_PUBLIC_CITY_ASSET_BASE_URL`, which defaults to the same-origin
`/city-assets` CDN path and can target external object storage. The worker is
given the resolved analytics URL, keeping `lib/` unaware of application storage.
The proxy Route Handlers, endpoint module, browser-tier repository method, and
Function tracing entries were removed. The DAL now owns only the manifest,
metadata, and materialized aggregate tiers.

**Verification:** Production build passes. A production server returns the
32.6 MB London points asset with `Cache-Control: public, max-age=31536000,
immutable`, while the former proxy URL returns 404. Unit tests cover default and
external asset origins, and the production Playwright Browse regression confirms
points load without an analytics request.

### R-0004 — Domain Kernel Reframed Rather Than Relocated

**Original leakage:** `lib/` imported domain types and pure policy constants
(`ROOM_TYPES`, `MIN_LISTING_FLOOR`, `MULTI_LISTING_THRESHOLD`) from
`data/contract.ts` + `data/types.ts`, contradicting the documented `data → lib`
direction; an ESLint exception papered over it.

**Resolution:** Those two modules are the type-only **domain kernel** — pure
shapes and policy constants with no IO — that sits logically below `lib`; the
`data/` prefix is storage co-location, not a dependency edge. Rather than move
files into `lib/domain/`, the boundary was reframed: the ESLint exception's
comment/message and the dependency diagrams in `CLAUDE.md` and
`docs/architecture.md` now describe `lib → domain-kernel` as intended, while
`lib` still must not import `data/` runtime (loaders/repository/selectors).
Feature/presentation types and listing-count formatting stay where they are.

**Verification:** ESLint, TypeScript, full Vitest (101 tests), and the
production build pass.

### R-0005 — Server DAL Barrel Has No Client Surface

**Original leakage:** `data/index.ts` re-exported server-only loaders alongside
runtime constants and client-consumed types, and a Client Component imported
`CityData` from it without `import type`, leaving the server/client cut dependent
on TypeScript import elision.

**Resolution:** `data/index.ts` now exposes only the server DAL — loaders,
selectors, `ScopeType`, and the `CityRepository` type. All client-safe
vocabulary was removed from it; consumers import shapes/constants from
`@/data/contract` and UI types from `@/data/types`. The `card-link.tsx` runtime
import is now `import type` from `@/data/types`. Enforcement is structural rather
than a new lint rule: the loaders pull `server-only`, so any client import of
`@/data` fails the build. A path-based ESLint ban was deliberately not added —
`features/**` legitimately contains Server Components that import loaders from
`@/data`, and ESLint cannot distinguish them from Client Components by path.

**Verification:** ESLint, TypeScript, full Vitest (101 tests), and the
production build pass.

### R-0006 — Snapshot Reads Distinguish Absence From Corruption

**Original leakage:** The static adapter used `JSON.parse(raw) as T` inside a
broad `catch` that returned `null`, collapsing missing files, malformed JSON, and
IO failures into one empty result that could surface as a false 404.

**Resolution:** `readJson` in `data/repository/static-json.ts` now returns
`null` only for `ENOENT`; malformed JSON and unexpected IO errors propagate and
fail visibly. Build-time schema validation was intentionally deferred: the
snapshots are frozen, already-processed artifacts with no live ingestion
pipeline, so a publishing/CI validation gate would guard a failure mode that
cannot occur. It is the natural addition if the generation pipeline returns.

**Verification:** TypeScript, ESLint, full Vitest (101 tests), and the
production build pass.

### R-0007 — Obsolete DAL Surface Removed

**Original leakage:** `getFilterBounds` and its barrel re-export had no
production consumer; the live filter-slider bounds come from
`priceBounds(framing)` client-side. (`getCityBoundaries` and the `/api/cities`
list route were already gone.)

**Resolution:** `getFilterBounds` and its now-unused `defaultFilters` import were
removed from `data/loaders.ts`, and the barrel re-export was dropped. The
`FilterBounds` type stays — it is used across `normalize`, the filter panel, and
the scene meta provider.

**Verification:** TypeScript, ESLint, full Vitest (101 tests), and the
production build pass.

### R-0008 — Every In-Scene City Switch Enters The Same Gate

**Original leakage:** The transition gate was opened only by `CityLink`'s
click-time `NAV.START`. Browser Back/Forward remounted the route and fired
`CITY.CHANGED` alone while root was `idle`, so the gate was skipped — the
outgoing city stayed interactive and undimmed while the replacement loaded.

**Resolution:** The root machine now recognizes a route-initiated replacement as
navigation. `CITY.CHANGED` is handled per-substate: in `idle`, a guard
(`isInSceneCityChange`) detects an existing, different city and enters
`navigating`, stamping `pendingSlug` and synthesizing the same `NAV.START`
fan-out to `map` (→ `ready.suppressed`) and `ui` (→ `navigating`); first entry
(no current city) and same-slug re-seeds stay ungated. The `map` and `ui`
machines are unchanged — they still react only to `NAV.START`, keeping root the
single fan-out point. `SceneUrlLoader` and `CityLink` are untouched.

**Verification:** Four connected-system regressions in
`features/scene/state/machines/__tests__/system.test.ts` cover the history-style
gate, first-entry stays ungated, rapid consecutive (latest-wins), and the
switcher path (no double-gate). TypeScript, ESLint, and full Vitest (105 tests)
pass.

**Interaction with C-0010:** This widens gating to history navigation, so a
failed city load after Back/Forward inherits the same gate behavior as switcher
transitions. The terminal-failure fix that lifts the gate is **R-0009**.

### R-0009 — A Failed City Load Lifts The Transition Gate

**Original leakage:** The city's `browse.error` / `analyse.error` states only
emitted `city.error` (toast). They sent no terminal event to root/map/ui, so a
failed in-scene transition left root `navigating`, map `suppressed`, and ui
dropping input forever — no recovery path.

**Resolution:** A `CITY.FAILED` terminal event now mirrors `CITY.READY`. The city
fans it to ROOT/MAP/UI on entry to either error state (`notifyCityFailed`); root
`navigating → idle` (clears `pendingSlug`, no URL sync), map
`ready.suppressed → interactive`, ui `navigating → active`. The toast still
explains the failure; the user lands on the failed slug with an operable switcher
(recovery, not rollback). First-entry failures are ungated, so `CITY.FAILED` is a
harmless no-op there. The map/ui error path reuses the same handlers as the
success terminal — the city is the single fan-out source.

A latent harness gap surfaced and was fixed: the test `setupSceneSystem` created
the root without `systemId: SystemId.ROOT`, so the city's `system.get(ROOT)`
fan-out silently no-oped; it now registers the root exactly as the provider does.

**Known limitation:** after the gate lifts the map may show the previous city's
layers (the new data never arrived) until the user navigates again — a cosmetic
follow-up, separate from the stuck-gate fix.

**Verification:** Three connected-system regressions in `system.test.ts` —
failed Analyse load lifts the gate, failed Browse load lifts the gate (opt-in
failing loader), and a first-entry failure stays ungated. TypeScript, ESLint, and
full Vitest (108 tests) pass.

### R-0010 — Worker Process Errors Are Snapshot-Guarded

**Original leakage:** `WORKER.PROCESS_RESULT` carried `slug`/`snapshotId` and was
dropped by the city if stale, but the worker's `deliverProcess` emitted
`WORKER.PROCESS_ERROR` _unstamped_, and the city handled it ungated. A recompute
failure from a city the user had navigated away from surfaced as a toast against
the new city.

**Resolution:** `WORKER.PROCESS_ERROR` now carries `slug`/`snapshotId`.
`deliverProcess` passes them through from the error reply message (which already
held them), and the city guards the event with the existing `fetchIsCurrent` —
the same current-city check used for `FETCH_*` and load replies — so a stale
process error is dropped. Success and failure recompute paths are now symmetric.

**Verification:** Connected-system + city-machine regressions in
`city-errors.test.ts`: a current-slug process error toasts (routed through the
worker), and a stale-slug one is dropped. TypeScript, ESLint, and full Vitest
(110 tests) pass.

### R-0011 — The Active Browse Load Has One Notification Owner

**Original leakage:** A terminal `browse-points` failure toasted twice — once
from the global `QueryCache.onError` (`"Couldn't load listings"`) and once from
the city lifecycle (`loadBrowsePoints` rejects → `city.error` →
`SceneNotifications` `"Couldn't load this city"`). Different toast ids defeated
dedup, so one failure showed two competing messages.

**Resolution:** The active Browse load belongs to the city lifecycle, so the
`browse-points` case was removed from the query layer's `notifyOnQueryError`
(`lib/query/client.ts`); the now-unused `browse-points` toast id was dropped from
`ErrorToastId`. The query layer still owns optional/background tiers
(`boundaries`), and the worker-thread client still owns analytics. The
`useBrowsePoints` hook is `enabled`-gated to the active Browse lens — exactly
when the city's `loadBrowsePoints` actor runs — so the city is always the owner
of that failure; no notification is lost.

**Verification:** A new `lib/query/client.test.ts` drives the real `onError`
path: a `browse-points` failure stays silent while a `boundaries` failure still
toasts once. The user-visible `scene.test.tsx` notification specs now assert a
single city-lifecycle toast for a failed Browse load (and that the old
`"Couldn't load listings"` is gone). TypeScript, ESLint, and full Vitest
(112 tests) pass.
