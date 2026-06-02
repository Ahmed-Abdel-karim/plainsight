import { describe, expect, it } from "vitest";

import type { Listing } from "@/data/contract";

import { computeAggregates } from "./aggregate";
import { filterListings } from "./filter";
import { sortListings } from "./sort";

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

describe("filterListings", () => {
  it("treats an empty roomTypes array as 'all types'", () => {
    const listings = [
      makeListing({ roomType: "Entire home/apt" }),
      makeListing({ roomType: "Private room" }),
    ];
    const result = filterListings(listings, {
      roomTypes: [],
      priceRange: [0, 1000],
    });
    expect(result).toHaveLength(2);
  });

  it("keeps only the selected room types", () => {
    const listings = [
      makeListing({ roomType: "Entire home/apt" }),
      makeListing({ roomType: "Private room" }),
      makeListing({ roomType: "Shared room" }),
    ];
    const result = filterListings(listings, {
      roomTypes: ["Private room", "Shared room"],
      priceRange: [0, 1000],
    });
    expect(result.map((l) => l.roomType)).toEqual([
      "Private room",
      "Shared room",
    ]);
  });

  it("applies the inclusive price band", () => {
    const listings = [
      makeListing({ price: 50 }),
      makeListing({ price: 100 }),
      makeListing({ price: 200 }),
    ];
    const result = filterListings(listings, {
      roomTypes: [],
      priceRange: [100, 200],
    });
    expect(result.map((l) => l.price)).toEqual([100, 200]);
  });
});

describe("sortListings", () => {
  it("sorts by price ascending and descending without mutating the input", () => {
    const listings = [
      makeListing({ price: 200 }),
      makeListing({ price: 50 }),
      makeListing({ price: 100 }),
    ];
    expect(sortListings(listings, "price_asc").map((l) => l.price)).toEqual([
      50, 100, 200,
    ]);
    expect(sortListings(listings, "price_desc").map((l) => l.price)).toEqual([
      200, 100, 50,
    ]);
    // input untouched
    expect(listings.map((l) => l.price)).toEqual([200, 50, 100]);
  });

  it("sorts by reviews/month descending with nulls last", () => {
    const listings = [
      makeListing({ reviewsPerMonth: 1.2 }),
      makeListing({ reviewsPerMonth: null }),
      makeListing({ reviewsPerMonth: 3.4 }),
    ];
    expect(
      sortListings(listings, "reviews_desc").map((l) => l.reviewsPerMonth),
    ).toEqual([3.4, 1.2, null]);
  });

  it("sorts by review count descending", () => {
    const listings = [
      makeListing({ numberOfReviews: 5 }),
      makeListing({ numberOfReviews: 50 }),
      makeListing({ numberOfReviews: 12 }),
    ];
    expect(
      sortListings(listings, "review_count_desc").map((l) => l.numberOfReviews),
    ).toEqual([50, 12, 5]);
  });
});

describe("computeAggregates", () => {
  it("suppresses concentration metrics below the listing floor", () => {
    const listings = [
      makeListing({ hostListingsCount: 5 }),
      makeListing({ hostListingsCount: 5 }),
    ];
    const aggregates = computeAggregates(listings);

    expect(aggregates.listingCount).toBe(2);
    expect(aggregates.meetsFloor).toBe(false);
    expect(aggregates.multiListingHostShare).toBeNull();
    expect(aggregates.topHosts).toEqual([]);
  });

  it("computes the canonical metrics above the floor", () => {
    // 20 listings: 10 from a multi-listing host, 10 singles; mixed reviews.
    const multi = Array.from({ length: 10 }, (_, i) =>
      makeListing({
        hostId: 999,
        hostName: "Mega Host",
        hostListingsCount: 8,
        price: 100 + i,
      }),
    );
    const singles = Array.from({ length: 10 }, () =>
      makeListing({ hostListingsCount: 1, price: 200, reviewsPerMonth: null }),
    );
    // give half the multi listings a review rate
    multi.forEach((l, i) => {
      if (i < 5) l.reviewsPerMonth = 2;
    });
    const aggregates = computeAggregates([...multi, ...singles]);

    expect(aggregates.meetsFloor).toBe(true);
    // 10 of 20 listings belong to a host with >= 2 listings
    expect(aggregates.multiListingHostShare).toBeCloseTo(0.5);
    // mean over REVIEWED listings only (5 listings @ 2/mo)
    expect(aggregates.avgReviewsPerMonth).toBeCloseTo(2);
    // the mega host tops the list with 10 listings
    expect(aggregates.topHosts[0]).toMatchObject({ hostId: 999, count: 10 });
    expect(aggregates.roomTypeMix["Entire home/apt"]).toBe(20);
  });

  it("returns a null median for an empty set", () => {
    expect(computeAggregates([]).medianPrice).toBeNull();
  });
});

describe("computeAggregates › priceHistogram", () => {
  it("is empty for no listings", () => {
    expect(computeAggregates([]).priceHistogram).toEqual([]);
  });

  it("collapses to a single bin when every price is equal", () => {
    const listings = Array.from({ length: 3 }, () =>
      makeListing({ price: 75 }),
    );
    expect(computeAggregates(listings).priceHistogram).toEqual([
      { x0: 75, x1: 75, count: 3 },
    ]);
  });

  it("produces 20 contiguous equal-width bins with the max clamped into the last", () => {
    // prices 0,5,…,100 → lo=0, hi=100, width=5. Each 5k lands left-closed in bin
    // k; hi (100) clamps into the last bin alongside 95.
    const prices = Array.from({ length: 21 }, (_, i) => i * 5);
    const hist = computeAggregates(
      prices.map((price) => makeListing({ price })),
    ).priceHistogram;

    expect(hist).toHaveLength(20);
    // edges
    expect(hist[0]).toMatchObject({ x0: 0, x1: 5 });
    expect(hist[19]).toMatchObject({ x0: 95, x1: 100 });
    // contiguity: each bin's upper edge is the next bin's lower edge
    for (let i = 0; i < hist.length - 1; i++) {
      expect(hist[i].x1).toBe(hist[i + 1].x0);
    }
    // top-edge clamp: 95 and 100 both fall in the final bin
    expect(hist[19].count).toBe(2);
    // every price is counted exactly once
    expect(hist.reduce((sum, b) => sum + b.count, 0)).toBe(prices.length);
  });
});
