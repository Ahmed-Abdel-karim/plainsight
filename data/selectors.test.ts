import { describe, expect, it } from "vitest";

import { datasetFixture } from "@/test/fixtures/dataset";
import { selectScopeAggregates } from "./selectors";

describe("selectScopeAggregates", () => {
  it("returns city-wide aggregates for the city scope", () => {
    const aggregates = selectScopeAggregates(datasetFixture, { type: "city" });

    expect(aggregates.listingCount).toBe(1000);
  });

  it("returns the neighbourhood's aggregates when scoped to a known neighbourhood", () => {
    const aggregates = selectScopeAggregates(datasetFixture, {
      type: "neighbourhood",
      id: "centre",
    });

    expect(aggregates.listingCount).toBe(120);
  });

  it("falls back to city-wide aggregates for an unknown neighbourhood", () => {
    const aggregates = selectScopeAggregates(datasetFixture, {
      type: "neighbourhood",
      id: "does-not-exist",
    });

    expect(aggregates).toBe(datasetFixture.cityAggregates);
  });
});
