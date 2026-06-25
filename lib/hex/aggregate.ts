/**
 * Pure hex aggregation kernel. Bins listings to the active H3 resolution and
 * rolls up `count` + `median(price)` per cell. Framework-light (h3-js + remeda)
 * so it is unit-testable on its own and runs unchanged inside the listings
 * worker.
 */
import { cellToBoundary, cellToParent } from "h3-js";
import {
  entries,
  filter,
  groupBy,
  map,
  mapValues,
  median,
  pipe,
  prop,
} from "remeda";

import type { HexCell, HexResolution } from "./types";

/** Minimal structural shape the aggregator needs from a listing row. */
export interface HexInput {
  /** Baked resolution-8 H3 cell; null/undefined rows are skipped. */
  h3?: string | null;
  price: number;
}

type LocatedRow = HexInput & { h3: string };

/** Bin listings to `resolution` and roll each cell up to `count` + median price.
 *  Empty cells are never produced — only cells with ≥ 1 located listing. */
export const aggregateHexes =
  (resolution: HexResolution) =>
  (listings: readonly HexInput[]): HexCell[] =>
    pipe(
      listings,
      filter((row): row is LocatedRow => row.h3 != null),
      groupBy((row) => cellToParent(row.h3, resolution)),
      mapValues((rows) => ({
        count: rows.length,
        medianPrice: median(map(rows, prop("price"))) as number,
      })),
      entries(),
      map(([h3, stats]): HexCell => {
        const ring = cellToBoundary(h3, true) as [number, number][];
        ring.push(ring[0]);
        return { h3, ring, ...stats };
      }),
    );
