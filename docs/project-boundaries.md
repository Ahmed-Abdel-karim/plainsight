# Project Boundaries

> This document defines the product outcomes and operating constraints of
> Plainsight v1. Architecture documents describe how the system satisfies them;
> ADRs record why significant implementation choices were made.

## Application Overview

Plainsight is a read-only short-term-rental market explorer for
research-oriented users. It helps a user examine where listings are
concentrated, what they cost, how the market is distributed by room type, and
which hosts control the most listings. A user can move from city-level patterns
to the individual public listing records behind them.

The application presents dated Inside Airbnb snapshots, not live inventory,
estimates, forecasts, or booking availability. The current launch set is London,
Berlin, Manchester, and Amsterdam, using September 2025 snapshots. Each city is
a coherent scenario: every map layer, aggregate, count, and listing shown for
that city must trace to the same published snapshot.

## Primary User And Journey

The primary user is a research-oriented person exploring market structure and
individual listings. Plainsight does not distinguish roles and has no account or
permission model.

The core journey is:

1. Choose a curated city.
2. Read its dated market context and explore aggregate price patterns.
3. Narrow the view by room type, price, or neighbourhood.
4. Switch to Browse to inspect the matching listings.
5. Share or reopen the exploration state through its URL.

## Capabilities

What the product must do, grouped by area. Each line is a requirement, not a
description of the implementation.

### Market entry and navigation

- `/` presents every enabled city from the canonical index as a selectable card
  showing name, country, framing, listing count, snapshot label, and image — no
  second hard-coded city list.
- Selecting a city opens its stable, human-readable `/${slug}` route in one
  action; cities can also be switched from within the scene.
- An unsupported slug shows a clear not-found state with a keyboard path back to
  the picker, never a blank map or another city's data.

### Market context and provenance

- A city opens at whole-city scope with no configuration, as a map plus a market
  panel.
- The scene names the active city and country, gives short market framing, and
  shows the snapshot date beside the figures it qualifies.
- Snapshot dates and counts come from the data contract; copy never calls them
  live, current, estimated, or predictive.
- Scope, room-type, and price filters produce consistent counts across Analyse
  summaries, map layers, and Browse.

### Analyse

- Shows recognizable geography, neighbourhood boundaries and labels, map
  controls, a visible legend, and required attribution.
- Default lens: listings aggregated into equal-area H3 cells colored by median
  price. Cell resolution adapts to zoom within bounded levels; empty areas stay
  uncolored.
- A hex cell can be inspected for its median price and contributing count.
- Exposes the result set's median price, multi-host share, review activity,
  price distribution, room-type mix, and leading hosts.

### Filters and neighbourhood scope

- Filter by one or more room types and an inclusive price range; applying or
  resetting updates every Analyse and Browse surface from one filter meaning.
- In Browse, neighbourhood boundaries stay visible and selectable; selecting one
  narrows results and map dots, clearing restores whole-city scope.
- A zero-result combination shows an explanatory empty state and a direct reset,
  not a broken panel.

### Browse and listing inspection

- Switch between Analyse and Browse without leaving the city or resetting
  filters, scope, map framing, or theme.
- The full matching set is browsable through a virtualized list; rows show
  listing, room type, neighbourhood, and price, sortable by price and review
  activity.
- Browse replaces hexes with one dot per listing; hover and selection link a row
  to its dot without relying on color alone.
- Selecting a row or dot opens dismissible detail (title, room type,
  neighbourhood, price, host and multi-host status, reviews, minimum nights,
  provenance). Booking availability is never invented.

### Restorable state, theme, and responsive layout

- The URL restores lens, neighbourhood scope, room and price filters, and
  selected listing; invalid values degrade to a valid state.
- Dark is the deterministic default; light persists. Map, overlays, legends, and
  UI switch together without reload.
- Desktop shows the panel beside the map; smaller layouts expose the same panel
  through a bottom drawer with usable, non-overlapping map controls.
- Every non-spatial action has a keyboard path, visible focus, and an accessible
  name; the map stays keyboard-pannable while scene interaction is enabled.

### Loading and failure

- During navigation, the previous city's layers and selections are never
  actionable as if they belonged to the destination; loading state names the
  incoming city.
- Data, compute, map, tile, and image failures produce bounded fallbacks or
  concise notifications. A failed recomputation keeps the last good result only
  when the UI marks it as possibly stale.

## Quality attributes

- **Scale:** supports at least the London reference snapshot — 61,963 listings,
  ~51 MB of uncompressed preprocessed city data.
- **Measured budgets:** loading and interaction budgets are set from a
  production-build baseline on a documented device and network. Unbenchmarked
  historical targets are not release guarantees.
- **Responsiveness:** map, filters, lens switching, and scrolling stay usable
  while large data loads or recomputes; the UI shows progress, never a frozen
  screen.
- **Data integrity:** a published city version is immutable; replacing data
  means publishing a new version. User-visible figures are reproducible from the
  snapshot and contract.
- **Accessibility:** first-party UI targets WCAG 2.2 AA. Automated checks,
  keyboard testing, contrast, focus, screen-reader spot checks, and
  reduced-motion are release gates. No formal conformance is claimed until manual
  evaluation is complete.
- **Non-visual meaning:** counts, filter state, listing attributes, loading, and
  errors are conveyed as text or semantics, not by position or color alone.
- **Browser/device:** stable Chrome on desktop and Android is the primary test
  and benchmark target. Edge, Firefox, Safari, and iOS Safari are compatibility
  targets where WebGL is available. No WebGL → a clear map-unavailable state.
- **Privacy and monitoring:** no accounts, ads, behavioral tracking, or session
  replay. Sentry is error-reporting only, with request bodies, query strings,
  cookies, and sensitive headers stripped. Vercel Analytics/Speed Insights cover
  aggregate performance.

## Data And Deployment Boundaries

- The product is read-only. It has no database, persistent application backend,
  mutation API, upload path, or administrative interface.
- Each city is delivered as an immutable, versioned set of independently usable
  metadata, aggregate, boundary, analytical, and browse-detail tiers.
- Small server-facing metadata and materialized summaries may be read and cached
  by Next.js. Large public tiers must be delivered directly through CDN-backed
  object-storage URLs rather than through Vercel Functions.
- A configurable asset base URL must keep the application independent of a
  particular object-storage provider.
- The deployment target is a public personal Vercel project that remains viable
  within free-tier cost boundaries. No production uptime or support SLA is
  promised.
- The base map depends on OpenFreeMap/OpenMapTiles/OpenStreetMap resources and
  must preserve their required attribution. Representative imagery is decorative
  and may depend on an external image CDN.

The rationale for immutable snapshots and the no-backend boundary is recorded in
[ADR 0003](decisions/0003-use-immutable-city-snapshots.md). Snapshot tiering and
delivery are the subject of
[ADR 0006](decisions/0006-tier-city-snapshots-and-share-calculation-core.md)
rather than this requirements document.

## Assumptions

- Published city tiers have passed preprocessing validation and conform to the
  shared data contract before deployment.
- Activating a city version is atomic: all tiers referenced by that version are
  available and describe the same source snapshot.
- Users have network access to the application, snapshot assets, vector tiles,
  and representative images.
- Supported devices provide a working WebGL implementation and enough memory for
  the selected city. The non-map UI remains understandable when WebGL fails.
- Inside Airbnb source fields are public snapshot observations. Plainsight does
  not independently verify host claims, listing accuracy, or future availability.
- The first version is English-only. Prices retain each city's configured
  currency and are not normalized across markets.

## Limitations

- The launch set contains four European cities from September 2025; it is not a
  comprehensive or current view of short-term rentals.
- Listing imagery is representative, not the source listing's photography.
- Published prices and host fields are shown as supplied after preprocessing;
  the application does not infer profitability, legality, or data quality.
- Browse currently parses and filters the largest point GeoJSON tier on the main
  thread. Its physical-phone budget remains to be measured.
- The application depends on external snapshot storage, map tiles, and image
  delivery and does not provide an offline mode.

## Explicit Non-Goals For V1

- Accounts, authentication, profiles, saved searches, favorites, or personalized
  recommendations.
- User uploads, editing, moderation, administration, or automated live ingestion.
- Live availability, booking, payments, host contact, or travel-planning flows.
- Forecasts, price estimates, investment advice, policy recommendations, or
  claims about causal housing-market effects.
- Cross-city comparison dashboards, historical trend analysis, or global market
  coverage.
- A database-backed query service or server-side analytical compute platform.
- A native mobile application, offline maps, or support for browsers without
  WebGL beyond the explicit fallback.
- A commercial availability, uptime, data-freshness, or customer-support SLA.

## Known Pre-Release Boundaries

These are remaining verification and deployment boundaries for a production-style
release. They do not block the public case study, but they document what is
and is not fully verified.

- Automated serious/critical axe checks pass for primary non-map UI surfaces.
  Real MapLibre/WebGL canvas contrast and map-overlay readability still require
  manual or visual-regression verification because axe cannot reliably evaluate
  pixels behind canvas-rendered map content.
- Desktop Chrome and physical Android Chrome have been smoke-tested. Desktop is
  the primary performance target; Android remains usable with acceptable map
  interaction slowdown on phone-class hardware. Safari, Firefox, Edge, and iOS
  Safari verification remain pending.
- If production moves city assets to external object storage, it must override
  `NEXT_PUBLIC_CITY_ASSET_BASE_URL` and configure that origin's CORS and immutable
  cache metadata. The committed `/city-assets` path remains the same-origin
  fallback for the public demo.

## Related Documents

- [Architecture](architecture.md)
- [Conventions](conventions.md)
- [Testing](testing.md)
- [Architecture Decision Records](decisions/README.md)
