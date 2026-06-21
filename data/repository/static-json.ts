import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";

import type {
  CityAggregates,
  CityIndexEntry,
  CityManifest,
  CityMeta,
  Neighbourhood,
  ScopeAggregates,
} from "@/data/contract";
import { selectScopeAggregates } from "@/data/selectors";
import type { Scope } from "@/data/types";

import type { CityRepository } from "./port";

// Server-only canonical store for the manifest, metadata, and aggregate tiers.
const DATA_DIR = join(process.cwd(), "data", "snapshots");

function isFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

/**
 * Read and parse a snapshot tier. A missing file is a legitimate absence and
 * returns `null` (a 404 upstream); malformed JSON and unexpected IO failures
 * (permissions, etc.) throw so corruption surfaces instead of masquerading as
 * an empty dataset.
 */
async function readJson<T>(filename: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(join(DATA_DIR, filename), "utf8");
  } catch (error) {
    if (isFileNotFound(error)) return null;
    throw error;
  }
  return JSON.parse(raw) as T;
}

// --- Tiered, snapshot-immutable parses -------------------------------------
// Each tier is cached independently, so a read only pays for the slice it needs:
// a KPI count or the snapshot label never parses a multi-MB array.

/** Framing tier: name, snapshot label, currency, bbox, price scale, … */
async function loadMeta(
  slug: string,
  snapshotId: string,
): Promise<CityMeta | null> {
  "use cache";
  cacheLife("max");
  return readJson<CityMeta>(`${slug}/${snapshotId}/meta.json`);
}

/** Materialised cube: city + per-neighbourhood aggregates + neighbourhood list. */
async function loadAggregates(
  slug: string,
  snapshotId: string,
): Promise<CityAggregates | null> {
  "use cache";
  cacheLife("max");
  return readJson<CityAggregates>(`${slug}/${snapshotId}/aggregates.json`);
}

async function listCities(): Promise<CityIndexEntry[]> {
  "use cache";
  cacheLife("max");
  const manifest = await readJson<CityManifest>("manifest.json");
  return manifest?.cities ?? [];
}

async function getCityMeta(
  slug: string,
  snapshotId: string,
): Promise<CityMeta | null> {
  return loadMeta(slug, snapshotId);
}

async function getNeighbourhoods(
  slug: string,
  snapshotId: string,
): Promise<Neighbourhood[]> {
  const cube = await loadAggregates(slug, snapshotId);
  return cube?.neighbourhoods ?? [];
}

async function getScopeAggregates(
  slug: string,
  snapshotId: string,
  scope: Scope,
): Promise<ScopeAggregates | null> {
  const cube = await loadAggregates(slug, snapshotId);
  return cube ? selectScopeAggregates(cube, scope) : null;
}

/**
 * The current production source: versioned per-city JSON in `data/snapshots`, split
 * into usage tiers (meta / aggregates) and read with Next's `"use cache"` on
 * each snapshot-immutable parse. Every read is an O(1) materialised lookup; the
 * client interactive tiers (`analytics`, `points`, `boundaries`) are fetched
 * directly from the public asset CDN (`cityAssetUrl`) and never pass through here.
 */
export const staticJsonRepository: CityRepository = {
  listCities,
  getCityMeta,
  getNeighbourhoods,
  getScopeAggregates,
};
