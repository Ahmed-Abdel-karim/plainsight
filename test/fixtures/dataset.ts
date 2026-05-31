import type { CityDataset, RoomType, ScopeAggregates } from "@/data";

const EMPTY_ROOM_MIX: Record<RoomType, number> = {
  "Entire home/apt": 0,
  "Private room": 0,
  "Shared room": 0,
  "Hotel room": 0,
};

/** Build a minimal valid `ScopeAggregates`, overriding only what a test cares about. */
export function makeAggregates(
  overrides: Partial<ScopeAggregates> = {},
): ScopeAggregates {
  return {
    listingCount: 0,
    medianPrice: null,
    multiListingHostShare: null,
    avgReviewsPerMonth: null,
    meetsFloor: false,
    roomTypeMix: { ...EMPTY_ROOM_MIX },
    topHosts: [],
    priceHistogram: [],
    ...overrides,
  };
}

/**
 * Minimal `CityDataset` for selector unit tests. Carries distinct city and
 * neighbourhood aggregates so scope selection is observable: the city total is
 * 1000, the "centre" neighbourhood is 120.
 */
export const datasetFixture: CityDataset = {
  slug: "london",
  name: "London",
  country: "United Kingdom",
  frame: "Largest market despite licensing",
  snapshotLabel: " 9/2025",
  currency: "GBP",
  bbox: [-0.51, 51.28, 0.33, 51.69],
  center: [-0.12, 51.5],
  hexEnabled: false,
  priceScale: { breaks: [50, 100, 150, 200], min: 10, max: 500 },
  priceCap: 450,
  cityAggregates: makeAggregates({ listingCount: 1000, meetsFloor: true }),
  neighbourhoods: [
    {
      id: "centre",
      name: "Centre",
      medianPrice: 180,
      listingCount: 120,
      meetsFloor: true,
    },
  ],
  neighbourhoodAggregates: {
    centre: makeAggregates({ listingCount: 120, meetsFloor: true }),
  },
  listings: [],
};
