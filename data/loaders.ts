import "server-only";

import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

import type { CityMeta, ScopeAggregates } from "./contract";
import { getRepository } from "./repository";
import { defaultFilters } from "./selectors";
import type { CityData, Scope } from "./types";

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

/**
 * E1-S2: full city metadata for framing the scene page (name, country,
 * currency, bbox, …). Thin facade over the port; the cached read lives in the
 * adapter.
 */
export async function getCityMeta(slug: string): Promise<CityMeta | null> {
  return getRepository().getCityMeta(slug);
}

/** E4-S1: neighbourhood polygon boundaries for the map choropleth. */
export async function getCityBoundaries(
  slug: string,
): Promise<NeighbourhoodBoundaries | null> {
  return getRepository().getBoundaries(slug);
}

/** Neighbourhood count for the scope label — facade over the port's list. */
export async function getCityNeighbourhoodCount(slug: string): Promise<number> {
  const neighbourhoods = await getRepository().getNeighbourhoods(slug);
  return neighbourhoods.length;
}

export type SidebarScopeType = Scope["type"];

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

function toScope(scopeType: SidebarScopeType, scopeId?: string): Scope | null {
  if (scopeType === "neighbourhood") {
    return scopeId ? { type: "neighbourhood", id: scopeId } : null;
  }

  return { type: "city" };
}

/**
 * E5: active-scope aggregates for the analysis sidebar cards. Facade over the
 * port — durable caching lives in the adapter's `"use cache"` (the materialised
 * cube is an O(1) lookup off the already-cached dataset), so no memo wrapper is
 * needed here; this only maps the cards' primitive scope into the port shape.
 * Currency/locale formatting stays in the leaf cards.
 */
export async function getSidebarScopeAggregates(
  citySlug: string,
  scopeType: SidebarScopeType,
  scopeId?: string,
): Promise<ScopeAggregates> {
  const scope = toScope(scopeType, scopeId);
  if (!scope) return unavailableAggregates;

  return (
    (await getRepository().getScopeAggregates(citySlug, scope)) ??
    unavailableAggregates
  );
}

/**
 * Stable price-slider bounds for the filter panel — the city's
 * `[priceScale.min, priceCap]`, the same range `defaultFilters` uses so that a
 * full-range slider is a no-op against the pre-baked aggregate cube. Derived
 * from the materialised `CityMeta` (O(1), already cached in the adapter), so it
 * doesn't shift per neighbourhood scope.
 */
export async function getSidebarFilterBounds(
  citySlug: string,
): Promise<{ min: number; max: number }> {
  const meta = await getRepository().getCityMeta(citySlug);
  if (!meta) return { min: 0, max: 1000 };

  const [min, max] = defaultFilters(meta).priceRange;
  return { min, max };
}

export async function getSidebarListingCount(
  citySlug: string,
  scopeType: SidebarScopeType,
  scopeId?: string,
): Promise<number> {
  const aggregates = await getSidebarScopeAggregates(
    citySlug,
    scopeType,
    scopeId,
  );

  return aggregates.listingCount;
}
