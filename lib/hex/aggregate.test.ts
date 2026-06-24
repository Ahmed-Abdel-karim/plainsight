import { cellToParent } from "h3-js";
import { median } from "remeda";
import { describe, expect, it } from "vitest";

import { aggregateHexes, type HexInput } from "./aggregate";

// Real res-8 cells: A and B share a res-6 (and res-5) parent; FAR is in a
// different parent at every coarser resolution.
const A = "881969c9bdfffff";
const B = "881969c981fffff";
const FAR = "88283082a1fffff";

function row(h3: string | null | undefined, price: number): HexInput {
  return { h3, price };
}

describe("aggregateHexes", () => {
  it("groups listings sharing a cell at the active resolution", () => {
    const cells = aggregateHexes(8)([row(A, 100), row(A, 200), row(B, 300)]);
    const byCell = new Map(cells.map((c) => [c.h3, c]));
    expect(byCell.get(A)).toEqual({ h3: A, count: 2, medianPrice: 150 });
    expect(byCell.get(B)).toEqual({ h3: B, count: 1, medianPrice: 300 });
  });

  it("merges into the shared parent cell at a coarser resolution", () => {
    const cells = aggregateHexes(6)([row(A, 100), row(B, 300), row(FAR, 50)]);
    const parent6 = cellToParent(A, 6);
    const byCell = new Map(cells.map((c) => [c.h3, c]));
    // A and B collapse into one res-6 cell; FAR stays separate.
    expect(cells).toHaveLength(2);
    expect(byCell.get(parent6)).toEqual({
      h3: parent6,
      count: 2,
      medianPrice: 200, // median(100, 300)
    });
    expect(byCell.get(cellToParent(FAR, 6))?.count).toBe(1);
  });

  it("matches the median per cell, including even-count interpolation", () => {
    const prices = [80, 120, 160, 240];
    const cells = aggregateHexes(8)(prices.map((p) => row(A, p)));
    expect(cells).toHaveLength(1);
    expect(cells[0].medianPrice).toBe(median(prices));
  });

  it("skips rows without an h3 but counts located ones", () => {
    const cells = aggregateHexes(8)([
      row(A, 100),
      row(null, 999),
      row(undefined, 999),
    ]);
    expect(cells).toEqual([{ h3: A, count: 1, medianPrice: 100 }]);
  });

  it("omits empty cells — an empty input yields no cells", () => {
    expect(aggregateHexes(8)([])).toEqual([]);
    expect(aggregateHexes(8)([row(null, 100)])).toEqual([]);
  });
});
