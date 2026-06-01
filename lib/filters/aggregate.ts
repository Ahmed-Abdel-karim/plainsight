import {
  MIN_LISTING_FLOOR,
  MULTI_LISTING_THRESHOLD,
  ROOM_TYPES,
  type Listing,
  type RoomType,
  type ScopeAggregates,
} from "@/data/contract";

const TOP_HOSTS_LIMIT = 5;
const PRICE_HISTOGRAM_BINS = 20;

function median(sortedAscending: readonly number[]): number | null {
  const n = sortedAscending.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0
    ? (sortedAscending[mid - 1] + sortedAscending[mid]) / 2
    : sortedAscending[mid];
}

function emptyRoomMix(): Record<RoomType, number> {
  return ROOM_TYPES.reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<RoomType, number>,
  );
}

function priceHistogram(
  prices: readonly number[],
): ScopeAggregates["priceHistogram"] {
  if (prices.length === 0) return [];
  const lo = prices[0];
  const hi = prices[prices.length - 1];
  if (lo === hi) return [{ x0: lo, x1: hi, count: prices.length }];

  const width = (hi - lo) / PRICE_HISTOGRAM_BINS;
  const bins = Array.from({ length: PRICE_HISTOGRAM_BINS }, (_, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    count: 0,
  }));
  for (const price of prices) {
    // Clamp the top edge into the last bin (price === hi).
    const idx = Math.min(
      PRICE_HISTOGRAM_BINS - 1,
      Math.floor((price - lo) / width),
    );
    bins[idx].count += 1;
  }
  return bins;
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
 * This is the live-compute twin of the build-time pre-baked aggregate cube. The
 * static adapter calls it for the on-demand filtered path; a SQL adapter does
 * the equivalent `GROUP BY`; the ingest job calls the same shape to materialize
 * `scope_aggregates`.
 */
export function computeAggregates(
  listings: readonly Listing[],
): ScopeAggregates {
  const listingCount = listings.length;
  const meetsFloor = listingCount >= MIN_LISTING_FLOOR;

  const prices = listings.map((l) => l.price).sort((a, b) => a - b);

  const roomTypeMix = emptyRoomMix();
  for (const listing of listings) roomTypeMix[listing.roomType] += 1;

  const reviewed = listings.filter((l) => l.reviewsPerMonth !== null);
  const avgReviewsPerMonth =
    reviewed.length === 0
      ? null
      : reviewed.reduce((sum, l) => sum + (l.reviewsPerMonth ?? 0), 0) /
        reviewed.length;

  // Concentration metrics are suppressed below the floor (contract).
  let multiListingHostShare: number | null = null;
  let topHosts: ScopeAggregates["topHosts"] = [];
  if (meetsFloor) {
    const multiCount = listings.filter(
      (l) => l.hostListingsCount >= MULTI_LISTING_THRESHOLD,
    ).length;
    multiListingHostShare = multiCount / listingCount;

    const byHost = new Map<
      number,
      { hostId: number; hostName: string | null; count: number }
    >();
    for (const listing of listings) {
      const entry = byHost.get(listing.hostId);
      if (entry) entry.count += 1;
      else
        byHost.set(listing.hostId, {
          hostId: listing.hostId,
          hostName: listing.hostName,
          count: 1,
        });
    }
    topHosts = [...byHost.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_HOSTS_LIMIT);
  }

  return {
    listingCount,
    medianPrice: median(prices),
    multiListingHostShare,
    avgReviewsPerMonth,
    meetsFloor,
    roomTypeMix,
    topHosts,
    priceHistogram: priceHistogram(prices),
  };
}
