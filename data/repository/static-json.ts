import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";

import type {
  CityDataset,
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

const DATA_DIR = join(process.cwd(), "data", "json");

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(join(DATA_DIR, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Load the full per-city dataset. Cached and snapshot-immutable, so every other
 * read derives from this one cached parse. `snapshotId` is accepted for port
 * parity but ignored — the static source ships only the latest snapshot.
 */
async function loadDataset(slug: string): Promise<CityDataset | null> {
  "use cache";
  cacheLife("max");
  return readJson<CityDataset>(`${slug}.json`);
}

function toCityMeta(dataset: CityDataset): CityMeta {
  return {
    slug: dataset.slug,
    name: dataset.name,
    country: dataset.country,
    frame: dataset.frame,
    snapshotLabel: dataset.snapshotLabel,
    currency: dataset.currency,
    bbox: dataset.bbox,
    center: dataset.center,
    hexEnabled: dataset.hexEnabled,
    priceScale: dataset.priceScale,
    priceCap: dataset.priceCap,
  };
}

/** Narrow the dataset's listings to the active scope (city-wide or one nb). */
function scopeListings(dataset: CityDataset, scope: Scope): Listing[] {
  if (scope.type === "city") return dataset.listings;
  return dataset.listings.filter((l) => l.neighbourhoodId === scope.id);
}

async function listCities(): Promise<CityIndexEntry[]> {
  "use cache";
  cacheLife("max");
  return (await readJson<CityIndexEntry[]>("cities.json")) ?? [];
}

async function getCityMeta(slug: string): Promise<CityMeta | null> {
  const dataset = await loadDataset(slug);
  return dataset ? toCityMeta(dataset) : null;
}

async function listSnapshots(slug: string): Promise<SnapshotRef[]> {
  const dataset = await loadDataset(slug);
  if (!dataset) return [];
  return [
    {
      id: `${slug}-latest`,
      citySlug: slug,
      label: dataset.snapshotLabel,
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
  const dataset = await loadDataset(slug);
  return dataset?.neighbourhoods ?? [];
}

async function getNeighbourhood(
  slug: string,
  id: string,
): Promise<Neighbourhood | undefined> {
  const dataset = await loadDataset(slug);
  return dataset ? selectNeighbourhood(dataset, id) : undefined;
}

async function getListing(
  slug: string,
  id: number,
): Promise<Listing | undefined> {
  const dataset = await loadDataset(slug);
  return dataset ? selectListingById(dataset, id) : undefined;
}

async function getScopeAggregates(
  slug: string,
  scope: Scope,
): Promise<ScopeAggregates | null> {
  const dataset = await loadDataset(slug);
  return dataset ? selectScopeAggregates(dataset, scope) : null;
}

async function getListingsForScope(
  slug: string,
  scope: Scope,
): Promise<Listing[]> {
  const dataset = await loadDataset(slug);
  return dataset ? scopeListings(dataset, scope) : [];
}

async function getFilteredAggregates(
  slug: string,
  scope: Scope,
  filters: ListingFilters,
): Promise<ScopeAggregates | null> {
  const dataset = await loadDataset(slug);
  if (!dataset) return null;
  return computeAggregates(
    filterListings(scopeListings(dataset, scope), filters),
  );
}

async function queryListings(
  slug: string,
  scope: Scope,
  filters: ListingFilters,
  sort: SortKey,
  page?: ListingQueryPage,
): Promise<ListingPage> {
  const dataset = await loadDataset(slug);
  if (!dataset) return { items: [], total: 0 };
  const matched = sortListings(
    filterListings(scopeListings(dataset, scope), filters),
    sort,
  );
  const items = page
    ? matched.slice(page.offset, page.offset + page.limit)
    : matched;
  return { items, total: matched.length };
}

/**
 * The current production source: per-city static JSON in `data/json`, read with
 * Next's `"use cache"` on the snapshot-immutable parses. This is the behaviour
 * the app shipped before the seam existed — now reachable only through the port.
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
