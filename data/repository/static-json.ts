import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";

import type {
  CityAggregates,
  CityIndexEntry,
  CityMeta,
  Listing,
  Neighbourhood,
  ScopeAggregates,
} from "@/data/contract";
import {
  selectListingById,
  selectNeighbourhood,
  selectScopeAggregates,
} from "@/data/selectors";
import type { ListingFilters, Scope, SortKey } from "@/data/types";
import type { NeighbourhoodBoundaries } from "@/lib/geo/types";
import { computeAggregates, filterListings, sortListings } from "@/lib/filters";

import type {
  CityRepository,
  ListingPage,
  ListingQueryPage,
  SnapshotRef,
} from "./port";

// Server-only canonical store (NOT web-served — clients go through the
// `/api/cities/...` route handlers). The same files this reads from disk are
// served, with ETag/304, by `lib/data-endpoint.ts`. See `scripts/split-city-data.ts`.
const DATA_DIR = join(process.cwd(), "data", "cities");

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(join(DATA_DIR, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// --- Tiered, snapshot-immutable parses -------------------------------------
// Each tier is cached independently, so a read only pays for the slice it needs:
// a KPI count or the snapshot label never parses the 20 MB+ listings array.

/** Framing tier: name, snapshot label, currency, bbox, price scale, … */
async function loadMeta(slug: string): Promise<CityMeta | null> {
  "use cache";
  cacheLife("max");
  return readJson<CityMeta>(`${slug}-meta.json`);
}

/** Materialised cube: city + per-neighbourhood aggregates + neighbourhood list. */
async function loadAggregates(slug: string): Promise<CityAggregates | null> {
  "use cache";
  cacheLife("max");
  return readJson<CityAggregates>(`${slug}-aggregates.json`);
}

/**
 * Computed tier: the full listings array. Cached like the others (immutable
 * snapshot), but only the on-demand recompute/browse reads touch it — never the
 * default scene render, which is served entirely from meta + the cube.
 */
async function loadListings(slug: string): Promise<Listing[] | null> {
  "use cache";
  cacheLife("max");
  return readJson<Listing[]>(`${slug}-listings.json`);
}

/** Narrow a listings array to the active scope (city-wide or one nb). */
function scopeListings(listings: readonly Listing[], scope: Scope): Listing[] {
  if (scope.type === "city") return [...listings];
  return listings.filter((l) => l.neighbourhoodId === scope.id);
}

async function listCities(): Promise<CityIndexEntry[]> {
  "use cache";
  cacheLife("max");
  return (await readJson<CityIndexEntry[]>("cities.json")) ?? [];
}

async function getCityMeta(slug: string): Promise<CityMeta | null> {
  return loadMeta(slug);
}

async function listSnapshots(slug: string): Promise<SnapshotRef[]> {
  const meta = await loadMeta(slug);
  if (!meta) return [];
  return [
    {
      id: `${slug}-latest`,
      citySlug: slug,
      label: meta.snapshotLabel,
      capturedAt: "",
    },
  ];
}

async function getBoundaries(
  slug: string,
): Promise<NeighbourhoodBoundaries | null> {
  "use cache";
  cacheLife("max");
  return readJson<NeighbourhoodBoundaries>(`${slug}-boundaries.geojson`);
}

async function getNeighbourhoods(slug: string): Promise<Neighbourhood[]> {
  const cube = await loadAggregates(slug);
  return cube?.neighbourhoods ?? [];
}

async function getNeighbourhood(
  slug: string,
  id: string,
): Promise<Neighbourhood | undefined> {
  const cube = await loadAggregates(slug);
  return cube ? selectNeighbourhood(cube, id) : undefined;
}

async function getListing(
  slug: string,
  id: number,
): Promise<Listing | undefined> {
  const listings = await loadListings(slug);
  return listings ? selectListingById(listings, id) : undefined;
}

async function getScopeAggregates(
  slug: string,
  scope: Scope,
): Promise<ScopeAggregates | null> {
  const cube = await loadAggregates(slug);
  return cube ? selectScopeAggregates(cube, scope) : null;
}

async function getListingsForScope(
  slug: string,
  scope: Scope,
): Promise<Listing[]> {
  const listings = await loadListings(slug);
  return listings ? scopeListings(listings, scope) : [];
}

async function getFilteredAggregates(
  slug: string,
  scope: Scope,
  filters: ListingFilters,
): Promise<ScopeAggregates | null> {
  const listings = await loadListings(slug);
  if (!listings) return null;
  return computeAggregates(
    filterListings(scopeListings(listings, scope), filters),
  );
}

async function queryListings(
  slug: string,
  scope: Scope,
  filters: ListingFilters,
  sort: SortKey,
  page?: ListingQueryPage,
): Promise<ListingPage> {
  const listings = await loadListings(slug);
  if (!listings) return { items: [], total: 0 };
  const matched = sortListings(
    filterListings(scopeListings(listings, scope), filters),
    sort,
  );
  const items = page
    ? matched.slice(page.offset, page.offset + page.limit)
    : matched;
  return { items, total: matched.length };
}

/**
 * The current production source: per-city static JSON in `data/cities`, split
 * into usage tiers (meta / aggregates / listings) and read with Next's
 * `"use cache"` on each snapshot-immutable parse. The O(1) materialised reads
 * (meta, cube) never load the listings array; only the computed reads do.

*/
export const staticJsonRepository: CityRepository = {
  listCities,
  listSnapshots,
  getCityMeta,
  getBoundaries,
  getNeighbourhoods,
  getNeighbourhood,
  getListing,
  getScopeAggregates,
  getListingsForScope,
  getFilteredAggregates,
  queryListings,
};
