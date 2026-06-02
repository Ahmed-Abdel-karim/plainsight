import {
  MIN_LISTING_FLOOR,
  MULTI_LISTING_THRESHOLD,
  ROOM_TYPES,
  type Listing,
  type RoomType,
  type ScopeAggregates,
} from "@/data/contract";
import { bin, max, mean, median, min, rollup } from "d3-array";

const TOP_HOSTS_LIMIT = 5;
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

function priceHistogram(
  prices: readonly number[],
): ScopeAggregates["priceHistogram"] {
  if (prices.length === 0) return [];
  const lo = min(prices) as number;
  const hi = max(prices) as number;
  if (lo === hi) return [{ x0: lo, x1: hi, count: prices.length }];

  // Fixed-count, equal-width bins. We pass d3 explicit interior thresholds (not
  // a bin *count*) so it yields exactly PRICE_HISTOGRAM_BINS uniform bins rather
  // than its "nice" tick thresholds. d3 does the bucket assignment; the edges are
  // labelled from the same canonical `lo + i*width` the thresholds derive from,
  // so the output is identical to the prior hand-rolled binning.
  const width = (hi - lo) / PRICE_HISTOGRAM_BINS;
  const thresholds = Array.from(
    { length: PRICE_HISTOGRAM_BINS - 1 },
    (_, i) => lo + (i + 1) * width,
  );
  return bin<number, number>()
    .domain([lo, hi])
    .thresholds(thresholds)(prices)
    .map((b, i) => ({
      x0: lo + i * width,
      x1: lo + (i + 1) * width,
      count: b.length,
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

  // d3.median interpolates the two middle values for even counts — the same
  // result as the prior sort-and-pick — and returns undefined for an empty set.
  const medianPrice = median(listings, (l) => l.price) ?? null;

  const roomTypeMix = emptyRoomMix();
  for (const listing of listings) roomTypeMix[listing.roomType] += 1;

  // d3.mean ignores null entries, so this is the mean over REVIEWED listings
  // only; undefined (none reviewed) collapses to null per the contract.
  const avgReviewsPerMonth = mean(listings, (l) => l.reviewsPerMonth) ?? null;

  // Concentration metrics are suppressed below the floor (contract).
  let multiListingHostShare: number | null = null;
  let topHosts: ScopeAggregates["topHosts"] = [];
  if (meetsFloor) {
    const multiCount = listings.filter(
      (l) => l.hostListingsCount >= MULTI_LISTING_THRESHOLD,
    ).length;
    multiListingHostShare = multiCount / listingCount;

    // Group by host; the first listing seen for a host carries its name. Both
    // the rollup's insertion order and the stable sort below match the prior
    // hand-rolled Map, so ties resolve identically.
    const byHost = rollup(
      listings,
      (group) => ({
        hostId: group[0].hostId,
        hostName: group[0].hostName,
        count: group.length,
      }),
      (l) => l.hostId,
    );
    topHosts = [...byHost.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_HOSTS_LIMIT);
  }

  return {
    listingCount,
    medianPrice,
    multiListingHostShare,
    avgReviewsPerMonth,
    meetsFloor,
    roomTypeMix,
    topHosts,
    priceHistogram: priceHistogram(listings.map((l) => l.price)),
  };
}
