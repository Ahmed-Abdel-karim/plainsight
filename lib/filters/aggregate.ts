import {
  MIN_LISTING_FLOOR,
  MULTI_LISTING_THRESHOLD,
  ROOM_TYPES,
  type Listing,
  type RoomType,
  type ScopeAggregates,
} from "@/data/contract";
import {
  filter,
  firstBy,
  isNonNullish,
  map,
  mean,
  median,
  pipe,
  prop,
  sortBy,
  take,
} from "remeda";

const TOP_HOSTS_LIMIT = 10;
const PRICE_HISTOGRAM_BINS = 20;

function emptyRoomMix(): Record<RoomType, number> {
  return ROOM_TYPES.reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<RoomType, number>,
  );
}

/**
 * Fixed-count, equal-width price bins over `[min, priceCap]`. Short-term-rental
 * prices are heavily right-skewed, so the upper edge is the city's `priceCap`
 * (its 99th-percentile ceiling) rather than the raw max: every price `>= priceCap`
 * folds into the **top bin** ("priceCap+"). That shares one ceiling with the price
 * filter, which already treats `priceCap` as open-topped (`resolvePriceBand`), so
 * the histogram and the slider never disagree on "and above".
 */
function priceHistogram(
  prices: readonly number[],
  priceCap: number,
): ScopeAggregates["priceHistogram"] {
  if (prices.length === 0) return [];
  const lo = firstBy(prices, (p) => p) as number;
  const hi = priceCap > lo ? priceCap : lo;
  if (hi === lo) return [{ x0: lo, x1: hi, count: prices.length }];

  const width = (hi - lo) / PRICE_HISTOGRAM_BINS;
  const counts = new Array<number>(PRICE_HISTOGRAM_BINS).fill(0);
  for (const price of prices) {
    const idx =
      price >= hi
        ? PRICE_HISTOGRAM_BINS - 1
        : Math.min(
            PRICE_HISTOGRAM_BINS - 1,
            Math.max(0, Math.floor((price - lo) / width)),
          );
    counts[idx] += 1;
  }
  return counts.map((count, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    count,
  }));
}

/**
 * Compute the canonical scope aggregates for a set of listings, faithful to the
 * contract's locked decisions:
 *  - multi-listing host = `hostListingsCount >= MULTI_LISTING_THRESHOLD`
 *  - below `MIN_LISTING_FLOOR`: concentration (`multiListingHostShare`) and
 *    `topHosts` are suppressed
 *  - `avgReviewsPerMonth` = mean over REVIEWED listings only
 *  - `medianPrice` (not mean); quantile breaks are a city-level concern
 *
 * The single definition of a scope's stats: the live filtered recompute (worker)
 * and the offline generator (`buildCityAggregates`) both call it, so the
 * precomputed numbers and a live recompute can never disagree.
 */
export function computeAggregates(priceCap: number) {
  return function (listings: readonly Listing[]): ScopeAggregates {
    const listingCount = listings.length;
    const meetsFloor = listingCount >= MIN_LISTING_FLOOR;
    const prices = map(listings, prop("price"));

    // median interpolates the two middle values for even counts and is undefined
    // for an empty set — collapsed to null per the contract.
    const medianPrice = median(prices) ?? null;

    const roomTypeMix = emptyRoomMix();
    for (const listing of listings) roomTypeMix[listing.roomType] += 1;

    // Mean over REVIEWED listings only: drop the null review rates first, so the
    // average ignores them; none reviewed collapses to null per the contract.
    const avgReviewsPerMonth =
      mean(
        pipe(listings, map(prop("reviewsPerMonth")), filter(isNonNullish)),
      ) ?? null;

    // Concentration metrics are suppressed below the floor (contract).
    let multiListingHostShare: number | null = null;
    let topHosts: ScopeAggregates["topHosts"] = [];
    if (meetsFloor) {
      const multiCount = listings.filter(
        (l) => l.hostListingsCount >= MULTI_LISTING_THRESHOLD,
      ).length;
      multiListingHostShare = multiCount / listingCount;

      // Group by host; the first listing seen for a host carries its name. A Map
      // preserves first-seen insertion order — a plain object would reorder the
      // numeric `hostId` keys — and remeda's stable `sortBy` keeps ties in that
      // order, so tied hosts resolve exactly as the prior d3.rollup did.
      const byHost = new Map<number, ScopeAggregates["topHosts"][number]>();
      for (const l of listings) {
        const seen = byHost.get(l.hostId);
        if (seen) {
          seen.count += 1;
        } else {
          byHost.set(l.hostId, {
            hostId: l.hostId,
            hostName: l.hostName,
            count: 1,
          });
        }
      }
      topHosts = pipe(
        [...byHost.values()],
        sortBy([prop("count"), "desc"]),
        take(TOP_HOSTS_LIMIT),
      );
    }

    return {
      listingCount,
      medianPrice,
      multiListingHostShare,
      avgReviewsPerMonth,
      meetsFloor,
      roomTypeMix,
      topHosts,
      priceHistogram: priceHistogram(prices, priceCap),
    };
  };
}
