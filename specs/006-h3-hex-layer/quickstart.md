# Quickstart: Hexagonal Price Map

## Prerequisites

```bash
pnpm add h3-js          # cellToParent + cellToBoundary (ships types). d3-array already present.
```

Regenerate the data tiers so the new analytics tier exists:

```bash
npx tsx scripts/split-city-data.ts     # now also writes public/data/{slug}-analytics.json
# commit the new public/data/*-analytics.json
```

## Build order (by user story)

1. **Foundation (pure kernel)** — `lib/hex/{types,resolution,aggregate}.ts`. Unit-test binning,
   median rollup, and zoom→resolution thresholds.
2. **Worker** — extend `protocol.ts`, `client.ts`, `compute.ts`, and `worker.ts` (load analytics
   tier; answer `hexes`). Unit-test the protocol shape / compute delegation.
3. **US1 (P1) — default price map**: `hex-colors.ts`, `hex-layer.tsx`, `hex-legend.tsx`,
   `use-hex-layer.ts`; mount in `map-canvas.tsx`; store slice in `map-store.ts`.
4. **US2 (P2) — zoom adaptivity**: debounced zoom→resolution observer in the canvas → store → bridge.
5. **US3 (P2) — filter reactivity**: bridge reads `useFilters`; re-query on change.
6. **US4 (P3) — inspect**: `hex-inspect.tsx`.

## Verify

### Automated (pure layers)

```bash
pnpm test          # lib/hex unit tests + existing suites green
pnpm exec tsc --noEmit
pnpm exec eslint .
```

- `lib/hex/aggregate.test.ts`: same listings → expected cells; `medianPrice` matches `d3.median`;
  empty/filtered sets omit cells; out-of-polygon (`h3` present) still counted.
- `lib/hex/resolution.test.ts`: zoom thresholds map to res 5–8 and clamp at the bounds.

### Manual (WebGL — `run-app` skill)

Run the `run-app` skill and confirm, per the spec's acceptance scenarios:

- **US1**: opening a city shows the hex price map by default with a legend; pricier areas shade
  toward the high end of the ramp; empty areas have no hex. Visible within ~2 s (SC-001).
- **US2**: zooming in subdivides hexes (finer detail); zooming out re-coarsens; holds at res 8 at
  closest zoom; no stale cells (SC-003).
- **US3**: applying a price/room-type filter recolors/empties the hexes; clearing restores; map
  total matches the sidebar cards (SC-004, SC-007).
- **US4**: hover/tap a hex → median price + count readout; dismisses cleanly.
- **Cross-cutting**: legible in dark **and** light themes (toggle recolors in place, SC-006);
  reduced-motion respected; largest city (London) smooth (SC-005).
