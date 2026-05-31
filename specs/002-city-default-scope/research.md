# Research: City Establishes the Default Analysis Scope

## Decision: City scope is the server-derived default `{ type: "city" }`

**Rationale**: The data layer already models analysis scope as `Scope = { type: "city" } | { type: "neighbourhood"; id: string }` (`data/types.ts`), and `selectScopeAggregates(dataset, scope)` returns `dataset.cityAggregates` for city scope. The city page sets the default scope to `{ type: "city" }`, derived from the URL slug on the server, with no client state. This satisfies "scope = whole city by default" (FR-001) and keeps the scene reload-safe and shareable (CR-004).

**Alternatives considered**: Introducing a Zustand store for scope now was rejected — there is no client narrowing in this story; scope is fully determined by the URL. A store belongs with the later neighbourhood-selection story, per the constitution's request-scoped store guidance.

## Decision: Total count in the scope label comes from city-scope aggregates

**Rationale**: Stakeholder confirmed "total count" = the city's total listing count. `selectScopeAggregates(dataset, { type: "city" }).listingCount` yields it for the active scope; formatting with `toLocaleString("en")` matches the picker's `formatListingCount` and the prototype's `city-scope-count`. Reading it from the dataset per slug keeps the label data-backed (FR-007), not hard-coded.

**Alternatives considered**: Reusing the picker's pre-formatted `CityData.listings` string was rejected because the scene already loads the full `CityDataset`, and sourcing the count from scope aggregates is the shape later scope narrowing (E1-S3, neighbourhoods) will reuse.

## Decision: Render the scene as a city-scoped shell, not the full map/analytics

**Rationale**: Stakeholder confirmed this story (E1-S2) delivers the scene shell — a map region and a sidebar region wired to city scope — while the interactive priced-pin map and analytics charts belong to later epics (E4–E7). The map region is a non-interactive placeholder (shadcn `Skeleton`) so no map library is added prematurely; the sidebar region hosts the scope label and leaves clearly-marked slots for deferred analytics. This keeps the story an independently testable slice (FR-003, FR-004).

**Alternatives considered**: Building the interactive map + charts now was rejected as out of scope and overlapping E4–E7. Leaving the page as the current single-heading stub was rejected because it does not present a map + sidebar scene.

## Decision: Graceful not-found via segment-scoped `app/[city]/not-found.tsx`

**Rationale**: The page already calls `notFound()` for unknown slugs (established in 001 and compatible with Cache Components). In the App Router, `notFound()` renders the nearest `not-found.tsx`; placing it at `app/[city]/not-found.tsx` scopes the graceful view to bad city slugs. It renders no scene regions (FR-011), avoiding any blank map, and provides a clear back-to-picker action (FR-008, FR-009). Stakeholder confirmed a rendered not-found page with an explicit action — not an automatic redirect.

**Alternatives considered**: An automatic `redirect("/")` was rejected per stakeholder direction (it hides the error and the user's chosen URL). Relying on Next's default 404 was rejected because it is neither on-brand nor offers a route back to the picker.

## Decision: Back-to-picker action is shadcn `Button` (`asChild`) + Next `Link`

**Rationale**: `rules/react-components.md` mandates shadcn for interactive controls. `components/ui/button.tsx` has no `"use client"`, so `<Button asChild><Link href="/">…</Link></Button>` renders inside a Server Component, gives Enter activation and the token-based visible focus ring for free, and keeps the not-found view fully server-rendered. Enter is the native, expected activation for a navigation link; Space activation (the picker cards' special case) is not required here.

**Alternatives considered**: A hand-rolled anchor was rejected (violates the shadcn rule and loses the standard focus ring). A Client Component for Space activation was rejected as unnecessary for a single navigation link.

## Decision: Scope label uses polite live-region semantics now

**Rationale**: The prototype renders the scope label as `role="status" aria-live="polite"` (`design/app/app.jsx`), and the constitution requires meaningful async/count changes to use live regions (CR-003). Adopting the polite live-region in this baseline means the later scope-label story (E1-S3) and scope narrowing announce count changes without re-plumbing. The semantics are markup-only, so the label stays a Server Component.

**Alternatives considered**: Plain static text was rejected because it would need to be revisited the moment scope can change; adding the live-region now is cheap and forward-compatible.
