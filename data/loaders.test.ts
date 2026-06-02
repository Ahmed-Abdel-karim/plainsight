import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAggregates } from "@/test/fixtures/dataset";

const getScopeAggregates = vi.fn();

vi.mock("./repository", () => ({
  getRepository: () => ({ getScopeAggregates }),
}));

import { getSidebarListingCount, getSidebarScopeAggregates } from "./loaders";

describe("sidebar scope loaders", () => {
  beforeEach(() => {
    getScopeAggregates.mockReset();
  });

  it("maps a city scope to the repository call", async () => {
    const aggregates = makeAggregates({ listingCount: 61963 });
    getScopeAggregates.mockResolvedValue(aggregates);

    await expect(getSidebarScopeAggregates("london", "city")).resolves.toBe(
      aggregates,
    );
    expect(getScopeAggregates).toHaveBeenCalledWith("london", { type: "city" });
  });

  it("maps a neighbourhood scope by id", async () => {
    getScopeAggregates.mockResolvedValue(makeAggregates());

    await getSidebarScopeAggregates("london", "neighbourhood", "centre");

    expect(getScopeAggregates).toHaveBeenCalledWith("london", {
      type: "neighbourhood",
      id: "centre",
    });
  });

  it("returns null for a neighbourhood scope with no id, without hitting the repository", async () => {
    await expect(
      getSidebarScopeAggregates("london", "neighbourhood"),
    ).resolves.toBeNull();
    expect(getScopeAggregates).not.toHaveBeenCalled();
  });

  it("derives the listing count from the scope aggregates", async () => {
    getScopeAggregates.mockResolvedValue(makeAggregates({ listingCount: 42 }));

    await expect(getSidebarListingCount("london", "city")).resolves.toBe(42);
  });

  it("reports a null listing count when the scope has no aggregates", async () => {
    await expect(
      getSidebarListingCount("london", "neighbourhood"),
    ).resolves.toBeNull();
  });
});
