import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import type {
  CityDataset,
  CityIndexEntry,
  NeighbourhoodBoundaries,
} from "./contract";
import type { CityData } from "./types";

const DATA_DIR = join(process.cwd(), "data", "json");

function toPath(filename: string): string {
  return join(DATA_DIR, filename);
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(toPath(filename), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatListingCount(n: number): string {
  return `${n.toLocaleString("en")} listings`;
}

function toData(entry: CityIndexEntry): CityData {
  return {
    slug: entry.slug,
    name: entry.name,
    country: entry.country,
    frame: entry.frame,
    listings: formatListingCount(entry.listingCount),
    snapshotLabel: entry.snapshotLabel,
  };
}

/** E1-S1: city index for the picker page. */
export async function getCitiesData(): Promise<CityData[]> {
  const entries = await readJson<CityIndexEntry[]>("cities.json");
  if (!entries) return [];
  return entries.map(toData);
}

/** E1-S2: full analytical dataset for a city page. null = unknown slug. */
export async function getCityDataset(
  slug: string,
): Promise<CityDataset | null> {
  "use cache";
  cacheLife("max");
  return readJson<CityDataset>(`${slug}.json`);
}

/** E4-S1: neighbourhood polygon boundaries for the map choropleth. null = unknown slug. */
export async function getCityBoundaries(
  slug: string,
): Promise<NeighbourhoodBoundaries | null> {
  "use cache";
  cacheLife("max");
  return readJson<NeighbourhoodBoundaries>(`${slug}-boundaries.geojson`);
}
