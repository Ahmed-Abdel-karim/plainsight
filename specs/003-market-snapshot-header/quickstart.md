# Quickstart: Market Title + Honest Snapshot Label

## Prerequisites

- Dependencies installed with `pnpm install`.
- Active feature branch: `003-market-snapshot-header`.

## Build And Static Checks

```bash
pnpm format:check
pnpm lint:strict
pnpm test          # includes colocated market-header display + a11y tests
pnpm build
```

## Manual Acceptance

1. Start the app:

   ```bash
   pnpm dev
   ```

2. Open `http://localhost:3000/london` (or pick London from the picker).

3. Header shows title + count + snapshot together (US1):
   - Confirm a single header at the top of the scene shows the market title `London`, the total listing count `61,963 listings`, and the snapshot label, all grouped together.
   - Confirm the count and the snapshot date are visible side by side, so the number is read with its point in time.
   - Confirm there is no separate scope label in the sidebar — the count appears only in the header.

4. Snapshot label is honest and per-city (US2):
   - Confirm the snapshot label reads exactly `Data: 9/2025 snapshot` (trimmed, numeric — no leading/doubled space, no spelled-out month).
   - Confirm it contains none of the words "live", "current", "real-time", and no present-tense "is/are now" framing.
   - Open `/amsterdam` and `/berlin` and confirm each header shows that city's own title and count, and its snapshot label sourced from the data.

5. Count reflects the active scope (US3):
   - Confirm the header count matches the city's total from the data (e.g. `London → 61,963`, `Amsterdam → 5,874`, `Manchester → 6,562`).
   - (Forward-looking) The count is read from the active scope's aggregates, so when neighbourhood narrowing/filters arrive in later epics the same header will reflect the narrower count with no header change.

6. Accessibility check:
   - Confirm the market title is the page's top-level heading (`<h1>`).
   - Confirm the count sits in a polite live region (it will announce changes once scope narrowing exists).
   - Tab through the scene and confirm the header (static text) adds no spurious tab stops.

7. Theme + responsive check:
   - Toggle dark/light and confirm the title, count, and snapshot label stay readable with sufficient contrast.
   - Narrow to mobile width and confirm all three elements remain visible (the count/snapshot line may wrap) — none is hidden or fully truncated.

8. Reload/share check:
   - Reload a supported city route and confirm the same header renders (everything is URL-slug + contract derived).

## Automated Coverage

- `components/scene/market-header.test.tsx` — renders `<MarketHeader>` with the dataset fixture (`test/fixtures/dataset.ts`, which carries `snapshotLabel: " 9/2025"`); asserts the `<h1>` title by role/name, the grouped count text, the exact `Data: 9/2025 snapshot` string (trim behavior), and the absence of the banned words.
- `components/scene/market-header.a11y.test.tsx` — axe: no violations; the heading and the polite live region are present.
- Data selection (`selectScopeAggregates`) is already unit-tested in `data/selectors.test.ts`; route wiring / `notFound()` remain manual/E2E per the constitution's Testing Layers.
