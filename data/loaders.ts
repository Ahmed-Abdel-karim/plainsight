import "server-only";

import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

import { getRepository } from "./repository";
import type { CityData } from "./types";

function formatListingCount(n: number): string {
  return `${n.toLocaleString("en")} listings`;
}

/**
 * E1-S1: city index for the picker page. Thin facade over the repository port —
 * the cached read lives in the active adapter; this only shapes the index
 * entries into the picker's display model (formatted listing count).
 */
export async function getCitiesData(): Promise<CityData[]> {
  const entries = await getRepository().listCities();
  return entries.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    country: entry.country,
    frame: entry.frame,
    listings: formatListingCount(entry.listingCount),
    snapshotLabel: entry.snapshotLabel,
  }));
}

/** E4-S1: neighbourhood polygon boundaries for the map choropleth. */
export async function getCityBoundaries(
  slug: string,
): Promise<NeighbourhoodBoundaries | null> {
  return getRepository().getBoundaries(slug);
}
