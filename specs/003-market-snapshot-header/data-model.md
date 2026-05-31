# Data Model: Market Title + Honest Snapshot Label

This story introduces no new persisted shapes. It composes existing types from the data contract (`data/contract.ts`) and the existing selector, and adds one presentational view model (the market header).

## City Dataset (source of title, count, and snapshot)

The city behind a `/[city]` route.

**Source**: `data/json/${slug}.json`, loaded by `getCityDataset(slug)` → `CityDataset | null`

**Fields used in this story** (from `CityDataset`):

- `name`: display name shown as the market title (the scene `<h1>`).
- `snapshotLabel`: per-city snapshot value, e.g. `" 9/2025"` (numeric month/year, may carry surrounding whitespace). Source of the snapshot label; required field, assumed present for supported cities.
- `cityAggregates`: `ScopeAggregates` for the whole city — supplies the active-scope count via the selector.

**Validation rules**:

- `name` and `snapshotLabel` come from the dataset for the active slug, never hard-coded per city (FR-002, FR-006).
- `snapshotLabel` is trimmed before display; rendered verbatim (no month-name expansion).

## Active Scope Count (for the header count)

**Source**: `data/selectors.ts` — `selectScopeAggregates(dataset, scope)`

**This story**:

- Called with `{ type: "city" }`, returning `dataset.cityAggregates`.
- The header reads `listingCount` from this result.

**Field used**:

- `listingCount`: total listings for the active scope, rendered grouped with `toLocaleString("en")` (e.g. `61,963`).

**Validation rules**:

- The count must be taken from the active scope's aggregates, not a per-city literal (FR-004), so a future scope change changes the count without touching the header.

## Market Header (view model — NEW)

The grouping at the top of the city scene that carries the market title, the active scope's count, and the snapshot label together.

**Component**: `components/scene/market-header.tsx` (synchronous presentational Server Component)

**Props** (plain serializable primitives passed from the route):

- `cityName: string` — the market title (← `dataset.name`)
- `listingCount: number` — the active scope's listing count (← `selectScopeAggregates(...).listingCount`)
- `snapshotLabel: string` — the raw per-city snapshot value (← `dataset.snapshotLabel`)

**Derived presentation**:

- title: `cityName`, rendered as the scene `<h1>` with `type-title` token typography
- count: `{listingCount.toLocaleString("en")} listings`, in a `role="status"` / `aria-live="polite"` element with `tabular-nums`
- snapshot label: `Data: {snapshotLabel.trim()} snapshot`, static text (outside the live region)
- the three are grouped in a single `<header>` so each number is read alongside the snapshot date (FR-001, FR-008)

**Validation rules**:

- The snapshot label MUST NOT contain "live", "current", or "real-time", and MUST NOT use present-tense framing (FR-007); the fixed `Data: … snapshot` template guarantees a dated, past framing.
- `snapshotLabel.trim()` MUST collapse the leading whitespace so the output is `Data: 9/2025 snapshot` (no doubled/leading space).
- Title and count appear only here in the scene — no duplicate scope label remains (FR-009, SC-006).

## Removed: Scope Label (E1-S2)

`components/scene/scope-label.tsx` is removed. Its responsibility (city name · count) is absorbed by the market header. Its only consumer was `city-scene.tsx`; `sidebar-region.tsx` no longer hosts a scope-label slot and keeps only the deferred-analytics placeholder skeletons.
