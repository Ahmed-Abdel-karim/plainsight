import "server-only";

import type { CityMeta, ScopeAggregates, StatsSnapshot } from "./contract";
import { getRepository } from "./repository";
import type { CityData } from "./types";

function formatListingCount(n: number): string {
  return `${n.toLocaleString("en")} listings`;
}

async function getActiveCity(slug: string) {
  const cities = await getRepository().listCities();
  return cities.find((city) => city.slug === slug) ?? null;
}

/**
 * City index for the picker page. Thin facade over the repository port: the
 * cached read lives in the active adapter; this only shapes entries into the
 * picker's display model.
 */
export async function getCitiesData(): Promise<CityData[]> {
  const entries = await getRepository().listCities();
  return entries.map((entry) => ({
    slug: entry.slug,
    snapshotId: entry.snapshotId,
    name: entry.name,
    country: entry.country,
    frame: entry.frame,
    listings: formatListingCount(entry.listingCount),
    snapshotLabel: entry.snapshotLabel,
  }));
}

/**
 * Full city metadata for framing the scene page. Thin facade over the port; the
 * cached read lives in the adapter.
 */
export async function getCityMeta(slug: string): Promise<CityMeta | null> {
  const city = await getActiveCity(slug);
  return city
    ? getRepository().getCityMeta(slug, city.snapshotId)
    : Promise.resolve(null);
}

/**
 * Listing totals that frame the city baseline and scoped result summaries: the
 * city-wide count, neighbourhood count, and an unfiltered per-neighbourhood
 * total map. All are read from the already-cached cube.
 */
export async function getCityScopeCounts(slug: string): Promise<{
  cityListingCount: number;
  neighbourhoodCount: number;
  neighbourhoodListingCounts: Record<string, number>;
}> {
  const city = await getActiveCity(slug);
  if (!city) {
    return {
      cityListingCount: 0,
      neighbourhoodCount: 0,
      neighbourhoodListingCounts: {},
    };
  }

  const repo = getRepository();
  const [neighbourhoods, cityAggregates] = await Promise.all([
    repo.getNeighbourhoods(slug, city.snapshotId),
    repo.getScopeAggregates(slug, city.snapshotId, null),
  ]);

  const neighbourhoodListingCounts: Record<string, number> = {};
  for (const nb of neighbourhoods) {
    neighbourhoodListingCounts[nb.id] = nb.listingCount;
  }

  return {
    cityListingCount: cityAggregates?.listingCount ?? 0,
    neighbourhoodCount: neighbourhoods.length,
    neighbourhoodListingCounts,
  };
}

const emptyRoomTypeMix: ScopeAggregates["roomTypeMix"] = {
  "Entire home/apt": 0,
  "Private room": 0,
  "Shared room": 0,
  "Hotel room": 0,
};

/** Zeroed read-model shown when a scope is missing or fails the listing floor. */
export const unavailableAggregates: ScopeAggregates = {
  listingCount: 0,
  medianPrice: null,
  multiListingHostShare: null,
  avgReviewsPerMonth: null,
  meetsFloor: false,
  roomTypeMix: emptyRoomTypeMix,
  topHosts: [],
  priceHistogram: [],
};

/**
 * The city's unfiltered aggregates for every scope, for the client to seed as
 * React Query `initialData`. Facade over the port; caching lives in the adapter.
 */
export async function getStatsSnapshot(
  citySlug: string,
): Promise<StatsSnapshot | null> {
  const city = await getActiveCity(citySlug);
  if (!city) return null;
  return getRepository().getStatsSnapshot(citySlug, city.snapshotId);
}
