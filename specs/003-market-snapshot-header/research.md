# Research: Market Title + Honest Snapshot Label

All three product decisions for this story were resolved interactively during `/speckit-specify` and are recorded in the spec's Assumptions. The remaining items below are design/technical decisions, with no NEEDS CLARIFICATION outstanding.

## Decision: Snapshot value is the contract `snapshotLabel`, rendered trimmed and verbatim

**Rationale**: `CityDataset` (and `CityIndexEntry`) already carry `snapshotLabel: string` (`data/contract.ts`), with values like `" 9/2025"` (numeric month/year, leading whitespace). Stakeholder confirmed the displayed form is `Data: 9/2025 snapshot` — numeric, not a spelled-out month. The header therefore renders `Data: {dataset.snapshotLabel.trim()} snapshot`, sourcing the date from the contract per city (FR-005/FR-006/FR-011) and trimming the leading space exactly as the city picker already does (`components/city-picker/city-card.tsx`: `{city.snapshotLabel.trim()} snapshot`).

**Alternatives considered**: Spelling out the month (9 → "September") was rejected per stakeholder choice — it would push month-name formatting into the UI. Reshaping the contract to carry a preformatted string was also rejected as unnecessary churn to the data layer/build output for this story.

## Decision: Snapshot string stays inline in the header (no shared formatter extracted)

**Rationale**: The picker renders `{snapshotLabel.trim()} snapshot`; the header renders `Data: {snapshotLabel.trim()} snapshot` (with the `Data:` prefix). The two usages differ, and the logic is a single trim + template literal. Per the constitution ("extract shared pure logic only when it has a stable contract and reduces real duplication"), this is kept inline rather than introducing a premature `formatSnapshotLabel` helper.

**Alternatives considered**: Extracting a shared helper now was rejected — the two call sites format differently and the duplication is trivial; a helper would couple them without a stable shared contract.

## Decision: Count comes from `selectScopeAggregates` for the active scope, not a literal

**Rationale**: `selectScopeAggregates(dataset, { type: "city" }).listingCount` already yields the active scope's total (returning `dataset.cityAggregates` for city scope). Wiring the header count to this selector — rather than a per-city constant — makes the count truthful for the active scope today (whole city) and forward-compatible when E4 narrowing/E7 filters change the scope (FR-004). Formatting reuses the established `toLocaleString("en")` + ` listings` convention (`data/loaders.ts` `formatListingCount`, E1-S2 `scope-label.tsx`).

**Alternatives considered**: Reusing the picker's pre-formatted `CityData.listings` string was rejected because the scene already loads the full `CityDataset`, and sourcing from scope aggregates is the shape narrowing will reuse. A hard-coded per-city count was rejected as untruthful the moment scope changes.

## Decision: One market header replaces the E1-S2 sidebar scope label

**Rationale**: Stakeholder chose a single page-level header (title + count + snapshot) at the top of the scene, with the standalone E1-S2 `ScopeLabel` consolidated into it so the count is not duplicated and cannot drift (FR-008/FR-009/SC-006). `scope-label.tsx` is the only consumer of itself (imported solely by `city-scene.tsx`), so removing it is low-risk and there are no existing scene tests referencing it.

**Alternatives considered**: Extending the sidebar label in place (keeping the title in the sidebar) and adding a header while keeping the sidebar label (two count surfaces) were both rejected by the stakeholder; the latter risks drift between two counts.

## Decision: Market title is the scene `<h1>`; count uses a polite live region

**Rationale**: The city scene currently has no page heading. Making the market title (city name only, per stakeholder) the `<h1>` gives the page a single top-level heading and an accessible name for the market (Accessibility principle). The count is wrapped in `role="status"` / `aria-live="polite"` — carried over from the E1-S2 baseline and the prototype — so later scope changes announce the new count without re-plumbing (CR-003). The snapshot label is static text outside the live region (it does not change with scope), keeping announcements limited to the count.

**Alternatives considered**: A non-heading title was rejected (the scene should expose a top-level heading). Putting the snapshot label inside the live region was rejected because the date is static and would add noise to count announcements. Plain static count text was rejected as it would need re-plumbing when narrowing lands.

## Decision: Header is a presentational Server Component receiving primitive props

**Rationale**: Per the constitution's Testing Layers, data fetching and `await` stay in the async route (`app/[city]/page.tsx`), which passes plain serializable props (`cityName: string`, `listingCount: number`, `snapshotLabel: string`) into the synchronous `MarketHeader`. This makes the display layer integration-testable with fixtures (no loader mocking) and keeps the component free of request-time work. No Client Component, store, or browser API is needed — the header is static text.

**Alternatives considered**: An async Server Component that loads its own data was rejected (it would violate the route/presentational split and be unsuitable for unit/integration rendering under Next.js + Vitest).
