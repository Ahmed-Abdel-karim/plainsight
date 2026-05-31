# UI Contract: Market Title + Honest Snapshot Label

## Market Header (in the city scene)

**Component**: `components/scene/market-header.tsx` (presentational Server Component), hosted at the top of `components/scene/city-scene.tsx`.

**Purpose**: Present the market title, the active scope's total listing count, and an honest dated snapshot label together as one header, so every figure is read alongside the point in time it represents.

**Inputs** (props, passed from `app/[city]/page.tsx`):

- `cityName: string` — from `dataset.name`.
- `listingCount: number` — from `selectScopeAggregates(dataset, { type: "city" }).listingCount`.
- `snapshotLabel: string` — from `dataset.snapshotLabel` (raw, e.g. `" 9/2025"`).

**Rendered content**:

- A market title rendered as the scene's `<h1>` showing the city name only (e.g. `London`).
- A total listing count for the active scope, grouped (e.g. `61,963 listings`).
- A snapshot label of the exact form `Data: {snapshot} snapshot`, where `{snapshot}` is `snapshotLabel.trim()` (e.g. `Data: 9/2025 snapshot`).
- The three elements grouped in a single `<header>`; the count and snapshot sit together so the date is visible alongside the number.

**State**:

- Active analysis scope = whole city (the only scope in this story); the count is the city total.
- The header is the single place the active scope's title and count appear in the scene (no duplicate scope label).

**Honesty constraints**:

- The snapshot label MUST NOT contain `live`, `current`, or `real-time`, and MUST NOT use present-tense framing implying up-to-the-moment data.
- The snapshot date MUST come from the contract per city; editing `snapshotLabel` in the data changes the display with no code change.

**Interactions**:

- No scope-changing interactions in this story; the header presents the city-wide baseline.

**Responsive behavior**:

- Desktop and mobile: the title, count, and snapshot label all remain visible and legible; the count/snapshot line may wrap but neither element is hidden or fully truncated.

**Accessibility contract**:

- The market title is the scene `<h1>` (single top-level heading) with an understandable accessible name.
- The count is inside a `role="status"` / `aria-live="polite"` region so a future scope change announces the new count; the snapshot label is static text outside the live region.
- The count and snapshot date read as understandable text; dark and light themes preserve readability and WCAG 2.1 AA contrast.
- No motion is introduced.

## Route wiring `app/[city]/page.tsx`

**Change**: Pass `snapshotLabel={dataset.snapshotLabel}` into the scene alongside the existing `cityName` and the scope-aggregate `listingCount`, so the scene can render `<MarketHeader>`. Data fetching, `await`, and `notFound()` stay in this async route boundary; the header receives only primitives.

## Removed surface

- `components/scene/scope-label.tsx` is removed; the standalone city-name · count label no longer renders in the sidebar. `components/scene/sidebar-region.tsx` keeps only its deferred-analytics placeholder skeletons.
