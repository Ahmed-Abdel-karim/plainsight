import { describe, expect, it } from "vitest";

import { aggregatesFixture } from "@/test/fixtures/dataset";
import { selectScopeAggregates } from "./selectors";

describe("selectScopeAggregates", () => {
  it("returns city-wide aggregates for the whole city (null)", () => {
    const aggregates = selectScopeAggregates(aggregatesFixture, null);

    expect(aggregates.listingCount).toBe(1000);
  });

  it("returns the neighbourhood's aggregates when scoped to a known neighbourhood", () => {
    const aggregates = selectScopeAggregates(aggregatesFixture, "centre");

    expect(aggregates.listingCount).toBe(120);
  });

  it("falls back to city-wide aggregates for an unknown neighbourhood", () => {
    const aggregates = selectScopeAggregates(
      aggregatesFixture,
      "does-not-exist",
    );

    expect(aggregates).toBe(aggregatesFixture.cityAggregates);
  });
});
