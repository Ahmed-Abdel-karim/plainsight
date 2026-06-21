import { describe, expect, it } from "vitest";

import type { Listing } from "@/data/contract";
import type { FilterBounds } from "@/data/types";

import { filterListings } from "./filter";
import {
  resolveFilters,
  resolvePriceBand,
  resolvePriceRange,
} from "./normalize";

const bounds: FilterBounds = { min: 20, max: 1100 };

let nextId = 1;
function makeListing(price: number): Listing {
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
    price,
    minNights: 1,
    numberOfReviews: 0,
    reviewsPerMonth: null,
    hostListingsCount: 1,
    imageVariant: 0,
  };
}

describe("resolvePriceRange (display band)", () => {
  it("resolves null to the concrete city bounds for the slider", () => {
    expect(resolvePriceRange(null, bounds)).toEqual([20, 1100]);
  });

  it("passes a narrowed range through unchanged", () => {
    expect(resolvePriceRange([100, 500], bounds)).toEqual([100, 500]);
  });
});

describe("resolvePriceBand (predicate band)", () => {
  it("opens the top to Infinity for the full range (null)", () => {
    expect(resolvePriceBand(null, bounds)).toEqual([20, Infinity]);
  });

  it("opens the top when the upper handle sits at the cap", () => {
    expect(resolvePriceBand([300, 1100], bounds)).toEqual([300, Infinity]);
  });

  it("keeps a real upper constraint when narrowed below the cap", () => {
    expect(resolvePriceBand([300, 800], bounds)).toEqual([300, 800]);
  });
});

describe("filterListings with the predicate band", () => {
  const listings = [makeListing(50), makeListing(900), makeListing(1500)];

  it("keeps listings above the cap at full range", () => {
    const filters = resolveFilters({ roomTypes: [], priceRange: null }, bounds);
    expect(filterListings(listings, filters).map((l) => l.price)).toEqual([
      50, 900, 1500,
    ]);
  });

  it("drops listings above the cap only once the top handle is pulled below it", () => {
    const filters = resolveFilters(
      { roomTypes: [], priceRange: [20, 1000] },
      bounds,
    );
    expect(filterListings(listings, filters).map((l) => l.price)).toEqual([
      50, 900,
    ]);
  });
});
