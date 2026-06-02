/**
 * One-time transform: split the legacy monolithic per-city JSON into the usage
 * tiers the app actually reads.
 *
 *   data/json/{slug}.json  (CityDataset, ~28 MB for London)
 *     ->  public/data/{slug}-meta.json        (CityMeta — framing)
 *     ->  public/data/{slug}-aggregates.json  (CityAggregates — materialised cube)
 *     ->  public/data/{slug}-listings.json    (Listing[] — full, dual-read feed)
 *     ->  public/data/{slug}-analytics.json   (AnalyticsListing[] — hex + cards tier)
 *
 * The analytics tier is a lightweight projection of each `Listing` carrying only
 * the fields the scene's worker needs for the hex price map and the sidebar
 * cards (h3, price, roomType + the host/review/neighbourhood card fields). It
 * omits the map/drawer-only fields (id, name, lat, lng, minNights, imageVariant)
 * so the worker fetches ~1.4 MB gz instead of the full listings feed.
 *
 * `cities.json` and the `*-boundaries.geojson` files are moved verbatim. The
 * destination is `public/data` (served at `/data/`) so the client map/browse can
 * `fetch()` the listings feed directly, and the server adapter reads the same
 * files from disk.
 *
 * This is NOT a maintained pipeline — the committed processed JSON is the
 * de-facto source. The script is kept as the record of how the tiers were
 * derived and to re-run if the tier shape changes. Run once with:
 *
 *   npx tsx scripts/split-city-data.ts
 *
 * After it succeeds, commit `public/data/` and delete the old `data/json/`.
 */
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

import type { CityDataset, CityIndexEntry, Listing } from "../data/contract";

const SRC_DIR = join(process.cwd(), "data", "json");
const OUT_DIR = join(process.cwd(), "public", "data");

/**
 * Lightweight projection of `Listing` the scene worker fetches: enough for the
 * hex price map (`h3, price, roomType`) and the sidebar cards (host/review/
 * neighbourhood fields). A structural subset of `Listing`, so `lib/filters`
 * runs over it unchanged.
 */
export type AnalyticsListing = Pick<
  Listing,
  | "h3"
  | "price"
  | "roomType"
  | "numberOfReviews"
  | "reviewsPerMonth"
  | "hostId"
  | "hostName"
  | "hostListingsCount"
  | "neighbourhoodId"
>;

export function projectAnalytics(
  listings: readonly Listing[],
): AnalyticsListing[] {
  return listings.map((l) => ({
    h3: l.h3,
    price: l.price,
    roomType: l.roomType,
    numberOfReviews: l.numberOfReviews,
    reviewsPerMonth: l.reviewsPerMonth,
    hostId: l.hostId,
    hostName: l.hostName,
    hostListingsCount: l.hostListingsCount,
    neighbourhoodId: l.neighbourhoodId,
  }));
}

async function readJson<T>(dir: string, file: string): Promise<T> {
  return JSON.parse(await readFile(join(dir, file), "utf8")) as T;
}

/** Compact for the heavy listings feed; readable 2-space for the small tiers. */
async function writeJson(file: string, value: unknown, pretty: boolean) {
  const json = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  await writeFile(join(OUT_DIR, file), json);
  const kb = (Buffer.byteLength(json) / 1024).toFixed(0);
  console.log(`  wrote ${file} (${kb} KB)`);
}

async function splitCity(slug: string) {
  console.log(`${slug}:`);
  const ds = await readJson<CityDataset>(SRC_DIR, `${slug}.json`);

  const {
    cityAggregates,
    neighbourhoods,
    neighbourhoodAggregates,
    listings,
    ...meta // CityMeta — everything that is not the cube or the listings
  } = ds;

  await writeJson(`${slug}-meta.json`, meta, true);
  await writeJson(
    `${slug}-aggregates.json`,
    { cityAggregates, neighbourhoods, neighbourhoodAggregates },
    true,
  );
  await writeJson(`${slug}-listings.json`, listings, false);
  await writeJson(`${slug}-analytics.json`, projectAnalytics(listings), false);

  // Boundaries move verbatim (already a separate file).
  const boundaries = `${slug}-boundaries.geojson`;
  await copyFile(join(SRC_DIR, boundaries), join(OUT_DIR, boundaries));
  console.log(`  copied ${boundaries}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const cities = await readJson<CityIndexEntry[]>(SRC_DIR, "cities.json");
  await copyFile(join(SRC_DIR, "cities.json"), join(OUT_DIR, "cities.json"));
  console.log("copied cities.json");

  for (const { slug } of cities) {
    await splitCity(slug);
  }

  // Surface any per-city JSON not covered by the index, so nothing is silently
  // left behind in the source dir.
  const leftover = (await readdir(SRC_DIR)).filter(
    (f) =>
      f.endsWith(".json") &&
      f !== "cities.json" &&
      !cities.some(({ slug }) => f === `${slug}.json`),
  );
  if (leftover.length) {
    console.warn(
      `\nUnsplit JSON files (not in cities.json): ${leftover.join(", ")}`,
    );
  }

  console.log("\nDone. Commit public/data/ and remove data/json/.");
}

// Only run the split when invoked directly (`tsx scripts/split-city-data.ts`);
// importing this module (e.g. to reuse `projectAnalytics`) must not auto-run it.
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
