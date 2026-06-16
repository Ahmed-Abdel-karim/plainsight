import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";

import type {
  CityAggregates,
  CityIndexEntry,
  CityMeta,
  Neighbourhood,
  ScopeAggregates,
} from "@/data/contract";
import { selectScopeAggregates } from "@/data/selectors";
import type { Scope } from "@/data/types";
import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

import type { CityRepository } from "./port";

// Server-only canonical store (NOT web-served — clients go through the
// `/api/cities/...` route handlers). These committed, pre-formatted tiers are
// the source of record; the materialised reads here load them from disk, while
// `lib/data-endpoint.ts` serves the interactive tiers (analytics/points) with
// ETag/304.
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
// a KPI count or the snapshot label never parses a multi-MB array.

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

async function listCities(): Promise<CityIndexEntry[]> {
  "use cache";
  cacheLife("max");
  return (await readJson<CityIndexEntry[]>("cities.json")) ?? [];
}

async function getCityMeta(slug: string): Promise<CityMeta | null> {
  return loadMeta(slug);
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

async function getScopeAggregates(
  slug: string,
  scope: Scope,
): Promise<ScopeAggregates | null> {
  const cube = await loadAggregates(slug);
  return cube ? selectScopeAggregates(cube, scope) : null;
}

/**
 * The current production source: per-city static JSON in `data/cities`, split
 * into usage tiers (meta / aggregates) and read with Next's `"use cache"` on
 * each snapshot-immutable parse. Every read is an O(1) materialised lookup; the
 * client interactive tiers (`analytics`, `points`) are fetched directly from the
 * route handlers and never pass through here.
 */
export const staticJsonRepository: CityRepository = {
  listCities,
  getCityMeta,
  getBoundaries,
  getNeighbourhoods,
  getScopeAggregates,
};
