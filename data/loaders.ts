import "server-only";

import type { CityMeta, ScopeAggregates } from "./contract";
import { getRepository } from "./repository";
import type { CityData, Scope } from "./types";

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

/** Neighbourhood count for the scope label — facade over the port's list. */
export async function getCityNeighbourhoodCount(slug: string): Promise<number> {
  const city = await getActiveCity(slug);
  if (!city) return 0;
  const neighbourhoods = await getRepository().getNeighbourhoods(
    slug,
    city.snapshotId,
  );
  return neighbourhoods.length;
}

export type ScopeType = Scope["type"];

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

function toScope(scopeType: ScopeType, scopeId?: string): Scope | null {
  if (scopeType === "neighbourhood") {
    return scopeId ? { type: "neighbourhood", id: scopeId } : null;
  }

  return { type: "city" };
}

/**
 * Active-scope aggregates for the analysis panel. Facade over the port: durable
 * caching lives in the adapter's `"use cache"`, so no memo wrapper is needed
 * here; this only maps the panel's primitive scope into the port shape.
 */
export async function getScopeAggregates(
  citySlug: string,
  scopeType: ScopeType,
  scopeId?: string,
): Promise<ScopeAggregates> {
  const scope = toScope(scopeType, scopeId);
  if (!scope) return unavailableAggregates;

  const city = await getActiveCity(citySlug);
  if (!city) return unavailableAggregates;

  return (
    (await getRepository().getScopeAggregates(
      citySlug,
      city.snapshotId,
      scope,
    )) ?? unavailableAggregates
  );
}

export async function getScopeListingCount(
  citySlug: string,
  scopeType: ScopeType,
  scopeId?: string,
): Promise<number> {
  const aggregates = await getScopeAggregates(citySlug, scopeType, scopeId);

  return aggregates.listingCount;
}
