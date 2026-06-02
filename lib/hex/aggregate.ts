/**
 * Pure hex aggregation kernel. Bins listings to the active H3 resolution and
 * rolls up `count` + `median(price)` per cell. Framework-light (h3-js +
 * d3-array, the locked aggregate engine) so it is unit-testable on its own and
 * runs unchanged inside the listings worker.
 */
import { median, rollup } from "d3-array";
import { cellToParent } from "h3-js";

import type { HexCell, HexResolution } from "./types";

/** Minimal structural shape the aggregator needs from a listing row. */
export interface HexInput {
  /** Baked resolution-8 H3 cell; null/undefined rows are skipped. */
  h3?: string | null;
  price: number;
}

/**
 * Aggregate listings into hex cells at `resolution`. Each row's baked res-8 cell
 * is truncated to the active resolution with `cellToParent`, then grouped to
 * `{ count, medianPrice }`. Rows without an `h3` are skipped; cells with no
 * listings are simply absent (FR-007 — empty, not filled).
 */
export function aggregateHexes(
  listings: readonly HexInput[],
  resolution: HexResolution,
): HexCell[] {
  const located = listings.filter(
    (l): l is HexInput & { h3: string } => l.h3 != null,
  );

  const grouped = rollup(
    located,
    (rows) => ({
      count: rows.length,
      // Every group has ≥ 1 row, so d3.median is always defined here.
      medianPrice: median(rows, (r) => r.price) as number,
    }),
    (row) => cellToParent(row.h3, resolution),
  );

  const cells: HexCell[] = [];
  for (const [h3, { count, medianPrice }] of grouped) {
    cells.push({ h3, count, medianPrice });
  }
  return cells;
}
