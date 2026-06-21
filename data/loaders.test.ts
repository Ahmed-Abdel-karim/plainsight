import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAggregates } from "@/test/fixtures/dataset";

const getRepositoryScopeAggregates = vi.fn();
const listCities = vi.fn();

vi.mock("./repository", () => ({
  getRepository: () => ({
    listCities,
    getScopeAggregates: getRepositoryScopeAggregates,
  }),
}));

import {
  getScopeListingCount,
  getScopeAggregates,
  unavailableAggregates,
} from "./loaders";

describe("sidebar scope loaders", () => {
  beforeEach(() => {
    getRepositoryScopeAggregates.mockReset();
    listCities.mockReset();
    listCities.mockResolvedValue([
      {
        slug: "london",
        snapshotId: "2025-09",
        name: "London",
        country: "United Kingdom",
        frame: "Strict licensing regime",
        snapshotLabel: " 9/2025",
        listingCount: 61963,
      },
    ]);
  });

  it("maps a city scope to the repository call", async () => {
    const aggregates = makeAggregates({ listingCount: 61963 });
    getRepositoryScopeAggregates.mockResolvedValue(aggregates);

    await expect(getScopeAggregates("london", "city")).resolves.toBe(
      aggregates,
    );
    expect(getRepositoryScopeAggregates).toHaveBeenCalledWith(
      "london",
      "2025-09",
      { type: "city" },
    );
  });

  it("maps a neighbourhood scope by id", async () => {
    getRepositoryScopeAggregates.mockResolvedValue(makeAggregates());

    await getScopeAggregates("london", "neighbourhood", "centre");

    expect(getRepositoryScopeAggregates).toHaveBeenCalledWith(
      "london",
      "2025-09",
      {
        type: "neighbourhood",
        id: "centre",
      },
    );
  });

  it("returns the zeroed aggregates for a neighbourhood scope with no id, without hitting the repository", async () => {
    await expect(getScopeAggregates("london", "neighbourhood")).resolves.toBe(
      unavailableAggregates,
    );
    expect(getRepositoryScopeAggregates).not.toHaveBeenCalled();
  });

  it("derives the listing count from the scope aggregates", async () => {
    getRepositoryScopeAggregates.mockResolvedValue(
      makeAggregates({ listingCount: 42 }),
    );

    await expect(getScopeListingCount("london", "city")).resolves.toBe(42);
  });

  it("reports a zero listing count when the scope has no aggregates", async () => {
    await expect(getScopeListingCount("london", "neighbourhood")).resolves.toBe(
      0,
    );
  });
});
