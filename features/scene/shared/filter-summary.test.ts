import { describe, expect, it } from "vitest";

import type { FilterBounds } from "@/data/types";

import { filterSummary, roomTypesLabel } from "./filter-summary";

const bounds: FilterBounds = { min: 20, max: 1100 };

describe("roomTypesLabel", () => {
  it("collapses the canonical empty selection to 'All room types'", () => {
    expect(roomTypesLabel([])).toBe("All room types");
  });

  it("joins the short labels of a subset", () => {
    expect(roomTypesLabel(["Entire home/apt", "Private room"])).toBe(
      "Entire, Private",
    );
  });
});

describe("filterSummary", () => {
  it("marks a cap-open range with '+' and never formats Infinity", () => {
    expect(
      filterSummary({ roomTypes: [], priceRange: [20, 1100] }, bounds, "GBP"),
    ).toBe("All room types · £20–£1,100+");
  });

  it("omits the '+' for a range narrowed below the cap", () => {
    expect(
      filterSummary(
        { roomTypes: ["Private room"], priceRange: [40, 800] },
        bounds,
        "GBP",
      ),
    ).toBe("Private · £40–£800");
  });
});
