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

## Functional Requirements

### Market Entry And Navigation

- **FR-001 — Curated markets:** `/` must present every enabled city from the
  canonical city index as a selectable card. Each card must show its name,
  country, market framing, listing count, snapshot label, and representative
  image without maintaining a second hard-coded city list.
- **FR-002 — Stable city routes:** Selecting a city must open its stable,
  human-readable `/${slug}` route in one action. A user must also be able to
  switch between supported cities from within the scene.
- **FR-003 — Unsupported routes:** An unsupported city slug must show a clear
  not-found state with a keyboard-accessible path back to the market picker. It
  must not render a blank map, raw error, or another city's data.

### Market Context And Provenance

- **FR-004 — Default scope:** A supported city route must open at whole-city
  scope without configuration and present the city scene as a map plus a market
  panel.
- **FR-005 — Honest market header:** The scene must identify the active city and
  country, provide short market framing, and show the snapshot date beside the
  figures it qualifies.
- **FR-006 — Dated-data language:** Snapshot dates and counts must come from the
  city data contract. Product copy must not describe snapshot figures as live,
  current, real-time, estimated, or predictive.
- **FR-007 — Coherent results:** The active scope, room-type filter, and price
  filter must produce consistent counts and subsets across Analyse summaries,
  map layers, and Browse results.

### Analyse

- **FR-008 — Geographic context:** The scene must show recognizable geography,
  neighbourhood boundaries and labels, map navigation controls, a visible data
  legend, and required provider attribution.
- **FR-009 — Price surface:** Analyse must be the default lens and show listings
  aggregated into equal-area H3 cells, colored by median nightly price. Cell
  resolution must adapt to map zoom within bounded levels, and empty areas must
  remain uncolored.
- **FR-010 — Inspectable evidence:** A user must be able to inspect a rendered
  hex cell to read its median price and contributing listing count.
- **FR-011 — Market summaries:** Analyse must expose the active result set's
  median price, multi-host share, review activity, price distribution, room-type
  mix, and leading hosts.

### Filters And Neighbourhood Scope

- **FR-012 — Shared filters:** A user must be able to filter by one or more room
  types and an inclusive nightly-price range. Applying or resetting filters must
  update every relevant Analyse and Browse surface from the same filter meaning.
- **FR-013 — Neighbourhood narrowing:** In Browse, neighbourhood boundaries must
  remain visible and selectable. Selecting one must narrow the listing results
  and map dots; clearing it must restore whole-city scope.
- **FR-014 — Empty results:** A zero-result filter or neighbourhood combination
  must show an explanatory empty state and a direct reset action rather than an
  empty or broken panel.

### Browse And Listing Inspection

- **FR-015 — Lens switching:** A user must be able to switch between Analyse and
  Browse without leaving the city or resetting the shared filters, scope, map
  framing, or theme.
- **FR-016 — Complete browsable set:** Browse must expose the entire matching
  result set through a virtualized, scrollable list. Rows must identify the
  listing, room type, neighbourhood, and nightly price, and the set must support
  sorting by price, review activity, and review count.
- **FR-017 — Linked list and map:** Browse must replace the price hexes with one
  map dot per matching listing. Hover and selection must link a list row with its
  corresponding dot without relying on color alone.
- **FR-018 — Listing detail:** Selecting a row or dot must open dismissible
  detail containing the listing title, room type, neighbourhood, nightly price,
  host and multi-host status, reviews, minimum nights, and snapshot provenance.
  Booking availability must not be invented when the dataset does not provide
  it.

### Restorable State, Theme, And Responsive Presentation

- **FR-019 — Shareable exploration:** The city route and URL query must restore
  the active lens, neighbourhood scope, room and price filters, and selected
  listing. Invalid or unavailable URL values must degrade to a valid state. Sort
  order may remain local view state.
- **FR-020 — Theme:** Dark must be the deterministic default. A user must be able
  to select and persist a light theme. The base map, overlays, legends, and UI
  must switch together without a page reload or loss of city and map framing.
- **FR-021 — Responsive scene:** Desktop must present the market panel beside the
  map. Smaller layouts must expose the same core panel content through a bottom
  drawer while preserving usable, non-overlapping map controls.
- **FR-022 — Interaction access:** Every non-spatial action must have a complete
  keyboard path, visible focus, and an understandable accessible name. The map
  must remain keyboard-pannable whenever scene interaction is enabled.

### Loading And Failure Behavior

- **FR-023 — Transition integrity:** During city navigation, the previous city's
  interactive layers and selections must not remain actionable as if they
  belonged to the destination. Loading state must identify the incoming city.
- **FR-024 — Recoverable failures:** Data, analytical computation, map, tile, and
  image failures must produce bounded fallbacks or concise notifications. A
  failed recomputation may retain the last good result only when the UI identifies
  that it may be stale.

## Non-Functional Requirements

### Data Integrity And Reproducibility

- **NFR-001 — Snapshot coherence:** A city version must be immutable after
  publication. Replacing data means publishing and activating a new version, not
  mutating files beneath an existing version.
- **NFR-002 — Traceability:** User-visible figures must be reproducible from the
  published snapshot and shared data contract. The displayed date must remain
  attached to the data it qualifies.

### Performance And Capacity

- **NFR-003 — Validated scale:** The application must support at least the
  current London reference snapshot: 61,963 listings across approximately 51 MB
  of uncompressed, preprocessed split city data.
- **NFR-004 — Measured budgets:** Final loading and interaction budgets must be
  set from a production-build baseline using a documented reference laptop,
  phone, stable Chrome version, and network profile. Historical unbenchmarked
  targets are not release guarantees.
- **NFR-005 — Responsiveness:** Map interaction, filter feedback, lens switching,
  and list scrolling must remain usable while analytical work and large datasets
  are loading or recomputing. The UI must expose progress rather than appearing
  frozen.

### Accessibility

- **NFR-006 — Standard:** First-party UI and core workflows target WCAG 2.2
  Level AA.
- **NFR-007 — Verification:** Automated accessibility checks, full keyboard
  testing, contrast review, focus behavior, screen-reader spot checks, and
  reduced-motion behavior are release gates. The project must not claim formal
  WCAG conformance until the deployed experience completes the required manual
  evaluation.
- **NFR-008 — Non-visual meaning:** Counts, filter state, listing attributes,
  loading status, and errors must be conveyed as text or semantics rather than
  by map position or color alone.

### Browser And Device Support

- **NFR-009 — Primary target:** Current stable Google Chrome on desktop and
  Android is the primary support, automated-test, and performance-benchmark
  target. Physical-phone verification is required before claiming Android
  performance support.
- **NFR-010 — Compatibility target:** Current stable Edge, Firefox, Safari, and
  iOS Safari are compatibility targets when WebGL is available. Focused release
  smoke checks may replace the full Chromium test matrix.
- **NFR-011 — Capability fallback:** A browser or device that cannot initialize
  WebGL must receive a clear map-unavailable state rather than a broken or blank
  scene.

### Reliability, Privacy, And Operations

- **NFR-012 — Graceful degradation:** Failure of an optional detail tier or
  external image must not corrupt already loaded market context. Retry and error
  messages must be bounded so one failure does not create repeated notifications.
- **NFR-013 — Privacy:** The application has no accounts, sign-up, advertising,
  custom event tracking, behavioral tracking, or session replay. Vercel Analytics
  and Speed Insights may collect page-level and performance telemetry in
  production.
- **NFR-014 — Errors-only monitoring:** Production Sentry use is limited to
  error reporting. Tracing, log ingestion, replay, profiling, user feedback, and
  user identity are disabled. Request bodies, query strings, cookies, and
  sensitive headers must be removed before transmission.
- **NFR-015 — Release evidence:** A release must pass the automated and manual
  gates defined in [Testing](testing.md). Architectural and repository rules are
  defined once in [Conventions](conventions.md), not repeated here.

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

## Clarification Record

### Session 2026-06-19

- Q: Who is the primary user? → A: A research-oriented user exploring market
  structure and individual listings.
- Q: How should performance requirements be defined? → A: Benchmark the
  current application first, then set measurable budgets against a documented
  reference device and network.

### Session 2026-06-20

- Q: What accessibility boundary should the project adopt? → A: Target WCAG
  2.2 Level AA for all first-party UI and core workflows.
- Q: What browsers and devices should the project support? → A: Support
  current evergreen desktop and mobile browsers with WebGL, with Chrome as the
  primary automated-test and performance-benchmark target.
- Q: What production monitoring should the project use? → A: Use Sentry for
  privacy-conscious error reporting only.

## Related Documents

- [Architecture](architecture.md)
- [Conventions](conventions.md)
- [Testing](testing.md)
- [Architecture Decision Records](decisions/README.md)
