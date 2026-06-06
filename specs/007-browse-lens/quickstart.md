# Quickstart — Browse Lens

## Prerequisites

- Add deps: `@tanstack/react-virtual`. Add shadcn `Tabs` primitive to `components/ui/tabs.tsx`
  (e.g. `npx shadcn@latest add tabs`).
- Regenerate the Browse tier once (the split script is the de-facto pipeline of record):
  `npx tsx scripts/split-city-data.ts` → writes `public/data/{slug}-points.geojson` for each city.
  (If `data/json/` was already removed, add `projectPoints` from the committed listings tier
  instead, or temporarily re-source the monolith — see `contracts/browse-tier.md`.)

## Build order (suggested)

1. **Tier + types**: `projectPoints` in `split-city-data.ts`; `BrowsePoint`/`BrowsePointProperties`
   in `data/contract.ts`; emit the files. Unit: a fixture asserts the projection shape + count.
2. **Pure sort**: `lib/browse/sort.ts` + `sort.test.ts` (all four `SortKey`s, null
   `reviewsPerMonth` last, stable tie-break by id).
3. **Lens state**: `components/scene/use-lens.ts` (nuqs `lens` + `listing`); `lens-tabs.tsx`
   (shadcn Tabs, `.map-chrome`, over the map).
4. **Sidebar swap**: `sidebar-content.tsx` renders `SidebarAnalysis` or `SidebarBrowse` by lens;
   `sidebar-browse.tsx` wires `use-browse-points` → `browse-summary` + `sort-control` +
   `listing-list` (virtualized) + `browse-empty`.
5. **Points layer**: `map/constants.ts` ids; `points/points-layer.tsx` + `point-colors.ts` +
   `use-points-layer.ts`; `map-store.ts` hover slice; `map-canvas.tsx` mounts the layer on Browse,
   toggles hex/points visibility + `interactiveLayerIds`, wires hover/click.
6. **Detail drawer**: `listing-detail.tsx` (shadcn Drawer, responsive direction) mounted in
   `city-scene.tsx`, opened from the `listing` param.

## Verify (run-app skill — WebGL/interaction is manual)

- **Lens swap (US1, SC-001)**: toggle Analyse↔Browse → sidebar swaps dashboard↔list, no reload;
  count reflects active filters.
- **Dots + filter (US2, FR-006, SC-003)**: Browse hides the hex layer and shows dots; moving the
  price slider / toggling room types updates dots + list + count promptly.
- **Hover link (FR-007, SC-004)**: hover a card → its dot emphasizes; hover a dot → its card
  emphasizes and scrolls into view.
- **Neighbourhood scope (FR-013)**: click a boundary in Browse → list, count, and dots narrow;
  clear → back to city-wide.
- **Sort (US4)**: change sort → order changes, count unchanged.
- **Detail drawer (US3, FR-008/009)**: click a card/dot → drawer floats over the map (right panel
  ≥lg, bottom sheet <lg) with the listing's fields (host/multi-host, reviews/mo, review count,
  min nights, provenance — **no availability**); Esc/close → dismisses, focus returns to trigger.
- **Deep-link (SC-005)**: open `?lens=browse&listing=<id>` → Browse with that drawer open; an
  unknown id → Browse, no drawer.
- **Empty (FR-012)**: filter to zero matches → empty state + reset; no rows, no dots.
- **Scale (SC-002)**: London, unfiltered → list scrolls smoothly to the end; all dots drawn.
- **A11y (CR-001/003, SC-006)**: full keyboard path (tabs/sort/list/drawer); focus trap;
  `prefers-reduced-motion`; dark + light; axe clean.

## Tests

- `npm test` green: `lib/browse/sort.test.ts`; the projection fixture; presentational integration
  tests (listing card/list/sort/summary/detail) with role/name queries.
- Typecheck + lint clean (strict; no `any`).
