import { describe, expect, it } from "vitest";

import type { Listing, RoomType } from "@/data/contract";
import type { FilterBounds } from "@/data/types";

import {
  createListingsService,
  UNFILTERED_SELECTION,
  type ListingSelection,
} from "./create-listings-service";

const bounds: FilterBounds = { min: 20, max: 1100 };

let nextId = 1;
function makeListing(over: Partial<Listing> = {}): Listing {
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
    ...over,
  };
}

const rows: Listing[] = [
  makeListing({
    neighbourhoodId: "centre",
    roomType: "Entire home/apt",
    price: 50,
  }),
  makeListing({
    neighbourhoodId: "centre",
    roomType: "Private room",
    price: 200,
  }),
  makeListing({
    neighbourhoodId: "north",
    roomType: "Entire home/apt",
    price: 900,
  }),
];

const api = createListingsService(rows, bounds);

describe("createListingsService", () => {
  it("getListingCount narrows by neighbourhood + room + price", () => {
    expect(api.getListingCount(UNFILTERED_SELECTION)).toBe(3);
    expect(
      api.getListingCount({
        ...UNFILTERED_SELECTION,
        neighbourhood: "centre",
      }),
    ).toBe(2);
    expect(
      api.getListingCount({
        ...UNFILTERED_SELECTION,
        roomTypes: ["Private room"] as RoomType[],
      }),
    ).toBe(1);
    expect(
      api.getListingCount({
        ...UNFILTERED_SELECTION,
        priceRange: [20, 300],
      }),
    ).toBe(2);
  });

  it("getStats matches the count for the same selection", () => {
    const selection: ListingSelection = {
      ...UNFILTERED_SELECTION,
      neighbourhood: "centre",
    };
    expect(api.getStats(selection).listingCount).toBe(
      api.getListingCount(selection),
    );
  });

  it("getListings returns the narrowed set, sorted", () => {
    const prices = api
      .getListings(
        { ...UNFILTERED_SELECTION, neighbourhood: "centre" },
        "price_asc",
      )
      .map((l) => l.price);
    expect(prices).toEqual([50, 200]);
  });

  it("isUnfiltered is true only for the empty whole-city selection", () => {
    expect(api.isUnfiltered(UNFILTERED_SELECTION)).toBe(true);
    expect(
      api.isUnfiltered({
        ...UNFILTERED_SELECTION,
        neighbourhood: "centre",
      }),
    ).toBe(false);
    expect(
      api.isUnfiltered({
        ...UNFILTERED_SELECTION,
        roomTypes: ["Private room"] as RoomType[],
      }),
    ).toBe(false);
  });

  it("getUnfilteredStatsSnapshot snapshots the city and each neighbourhood", () => {
    const snapshot = api.getUnfilteredStatsSnapshot();
    expect(snapshot.city.listingCount).toBe(3);
    expect(Object.keys(snapshot.neighbourhoods).sort()).toEqual([
      "centre",
      "north",
    ]);
    expect(snapshot.neighbourhoods.centre.listingCount).toBe(2);
    expect(snapshot.neighbourhoods.north.listingCount).toBe(1);
  });
});
