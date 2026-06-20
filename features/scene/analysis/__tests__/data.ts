/**
 * Analysis-region test data. The framing + the minimal `makeAggregates` builder
 * are the shared fixtures; `makeRichAggregates` is the region-local handle for a
 * fully-populated scope (metrics above the floor, non-empty charts) so the
 * default/filtered cases read the real cards instead of the empty fallbacks.
 */
import type { ScopeAggregates } from "@/data/contract";
import { makeAggregates } from "@/test/fixtures/dataset";

export { makeAggregates } from "@/test/fixtures/dataset";
export { makeMapCityPayload } from "@/test/fixtures/browse";

/** A scope above the listing floor with every card's data present. */
export function makeRichAggregates(
  overrides: Partial<ScopeAggregates> = {},
): ScopeAggregates {
  return makeAggregates({
    listingCount: 1000,
    meetsFloor: true,
    medianPrice: 150,
    multiListingHostShare: 0.42,
    avgReviewsPerMonth: 1.2,
    roomTypeMix: {
      "Entire home/apt": 600,
      "Private room": 300,
      "Shared room": 80,
      "Hotel room": 20,
    },
    topHosts: [
      { hostId: 1, hostName: "Ada", count: 9 },
      { hostId: 2, hostName: "Bo", count: 6 },
      { hostId: 3, hostName: "Cy", count: 4 },
    ],
    priceHistogram: [
      { x0: 0, x1: 100, count: 200 },
      { x0: 100, x1: 200, count: 500 },
      { x0: 200, x1: 300, count: 300 },
    ],
    ...overrides,
  });
}
