import { describe, expect, it } from "vitest";

import type { Listing } from "@/data/contract";
import type { ListingFilters } from "@/data/types";

import { aggregatesFor, scopeListings } from "./compute";

let nextId = 1;
function makeListing(overrides: Partial<Listing> = {}): Listing {
  const id = nextId++;
  return {
    id,
    name: `Listing ${id}`,
    hostId: id,
    hostName: `Host ${id}`,
    neighbourhoodId: "centre",
    lat: 51.5,
    lng: -0.12,
    roomType: "Entire home/apt",
    price: 100,
    minNights: 1,
    numberOfReviews: 0,
    reviewsPerMonth: null,
    hostListingsCount: 1,
    imageVariant: 0,
    ...overrides,
  };
}

const ALL: ListingFilters = {
  roomTypes: [],
  priceRange: [0, 10_000],
};

describe("scopeListings", () => {
  it("returns every listing for the city scope", () => {
    const listings = [makeListing(), makeListing({ neighbourhoodId: "soho" })];
    expect(scopeListings(listings, { type: "city" })).toHaveLength(2);
  });

  it("narrows to a neighbourhood by id", () => {
    const listings = [
      makeListing({ neighbourhoodId: "centre" }),
      makeListing({ neighbourhoodId: "soho" }),
      makeListing({ neighbourhoodId: "centre" }),
    ];
    const result = scopeListings(listings, {
      type: "neighbourhood",
      id: "centre",
    });
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.neighbourhoodId === "centre")).toBe(true);
  });
});

describe("aggregatesFor", () => {
  it("counts the filtered set for the active scope", () => {
    const listings = [
      makeListing({ neighbourhoodId: "centre", price: 100 }),
      makeListing({ neighbourhoodId: "centre", price: 500 }),
      makeListing({ neighbourhoodId: "soho", price: 100 }),
    ];

    const result = aggregatesFor(
      listings,
      { type: "neighbourhood", id: "centre" },
      { roomTypes: [], priceRange: [0, 200] },
    );

    // Only the £100 centre listing survives scope + price filter.
    expect(result.listingCount).toBe(1);
    expect(result.medianPrice).toBe(100);
  });

  it("matches the unfiltered city count", () => {
    const listings = Array.from({ length: 5 }, () => makeListing());
    expect(aggregatesFor(listings, { type: "city" }, ALL).listingCount).toBe(5);
  });
});
