/**
 * Emit the Browse tier (`data/cities/{slug}-points.geojson`) from the committed
 * `{slug}-listings.json` tier.
 *
 * `split-city-data.ts` is the projection of record, but it reads the legacy
 * `data/json/` monolith, which has been removed (the processed tiers in
 * `data/cities/` are now the de-facto source). This one-off re-derives just the
 * points tier from the committed `Listing[]` feed, exactly the fallback the
 * Browse-tier contract describes. Run once with:
 *
 *   npx tsx scripts/emit-points.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CityIndexEntry, Listing } from "../data/contract";
import { projectPoints } from "./split-city-data";

const DATA_DIR = join(process.cwd(), "data", "cities");

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(join(DATA_DIR, file), "utf8")) as T;
}

async function main() {
  const cities = await readJson<CityIndexEntry[]>("cities.json");

  for (const { slug } of cities) {
    const listings = await readJson<Listing[]>(`${slug}-listings.json`);
    const points = projectPoints(listings);
    const json = JSON.stringify(points);
    await writeFile(join(DATA_DIR, `${slug}-points.geojson`), json);
    const mb = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
    console.log(
      `wrote ${slug}-points.geojson — ${points.features.length} features (${mb} MB)`,
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
