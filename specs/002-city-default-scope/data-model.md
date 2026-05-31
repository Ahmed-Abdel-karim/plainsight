# Data Model: City Establishes the Default Analysis Scope

This story introduces no new persisted shapes. It composes existing types from the
data contract (`data/contract.ts`) and UI types (`data/types.ts`).

## Analysis Scope

The current lens all analytics describe.

**Source**: `data/types.ts` — `Scope = { type: "city" } | { type: "neighbourhood"; id: string }`

**This story**:

- The active scope is always `{ type: "city" }`, set on the server from the route slug.
- No `neighbourhood` scope is produced here; narrowing is a later story.

**Validation rules**:

- Scope must be derived from the URL slug (not from client state) so the scene is reload-safe and shareable.
- Scope-dependent content must reflect `{ type: "city" }` while no narrowing is active.

## Supported City / City Dataset

The city behind a `/[city]` route.

**Source**: `data/json/${slug}.json`, loaded by `getCityDataset(slug)` → `CityDataset | null`

**Fields used in this story** (from `CityDataset`):

- `slug`: route segment, must equal the requested slug
- `name`: display name shown in the scope label
- `cityAggregates`: `ScopeAggregates` for the whole city

**Validation rules**:

- `getCityDataset(slug)` returning `null` means the slug is unsupported → not-found path.
- Only an exact slug match resolves to a dataset; case/whitespace variants that do not match return `null`.
- The supported set is exactly the cities in the data directory (`cities.json` index), shared with the picker.

## Scope Aggregates (for the label count)

**Source**: `data/selectors.ts` — `selectScopeAggregates(dataset, scope)`

**This story**:

- Called with `{ type: "city" }`, returning `dataset.cityAggregates`.
- The label reads `listingCount` from this result.

**Field used**:

- `listingCount`: total listings for the city scope, rendered grouped (e.g. `61,963`).

## Scope Label (view model)

A user-visible summary of the active scope.

**Derived fields**:

- `cityName`: `dataset.name`
- `count`: `selectScopeAggregates(dataset, { type: "city" }).listingCount`, formatted with `toLocaleString("en")`
- presentation: `"{cityName} · {count} listings"` with polite live-region semantics

**Validation rules**:

- City name and count must come from the dataset for the active slug, never hard-coded.
- The count must be human-readable with digit grouping.

## City Scene (view model)

The city-scoped shell rendered on a supported route.

**Composed of**:

- map region: non-interactive placeholder shell (interactive map deferred to E4/E5)
- sidebar region: hosts the scope label and clearly-marked slots for deferred analytics

**Validation rules**:

- Both regions must render against city scope; neither may be blank/missing.
- The scene must not render on the not-found path.

## Not-Found View (view model)

Shown when a slug does not resolve to a supported city.

**Content**:

- a graceful message identifying that the city was not found
- a back-to-picker action linking to `/`

**Validation rules**:

- Renders no scene regions and no other city's scoped content.
- The back-to-picker action is keyboard reachable, has a visible focus indicator, and activates with Enter.
