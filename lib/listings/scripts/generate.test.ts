import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
  CityAggregates,
  CityManifest,
  CityMeta,
  Listing,
} from "@/data/contract";
import type { FilterBounds } from "@/data/types";

import { buildCityAggregates } from "./generate";

const ROOT = process.cwd();
const WRITE = process.env.WRITE_STATS === "1";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8")) as T;
}

function cityInputs(slug: string, snapshotId: string) {
  const rows = readJson<Listing[]>(
    `public/city-assets/${slug}/${snapshotId}/analytics.json`,
  );
  const meta = readJson<CityMeta>(
    `data/snapshots/${slug}/${snapshotId}/meta.json`,
  );
  const boundaries = readJson<GeoJSON.FeatureCollection>(
    `public/city-assets/${slug}/${snapshotId}/boundaries.geojson`,
  );
  const bounds: FilterBounds = { min: meta.priceScale.min, max: meta.priceCap };
  const names: Record<string, string> = {};
  for (const feature of boundaries.features) {
    const props = feature.properties as { id: string; name: string };
    names[props.id] = props.name;
  }
  return { rows, bounds, names };
}

const manifest = readJson<CityManifest>("data/snapshots/manifest.json");

describe("materialized aggregates", () => {
  for (const city of manifest.cities) {
    it(`${city.slug}: the entity reproduces the committed file`, () => {
      const { rows, bounds, names } = cityInputs(city.slug, city.snapshotId);
      const generated = buildCityAggregates(rows, bounds, names);
      const path = `data/snapshots/${city.slug}/${city.snapshotId}/aggregates.json`;

      if (WRITE) {
        writeFileSync(
          join(ROOT, path),
          `${JSON.stringify(generated, null, 2)}\n`,
        );
        return;
      }

      const committed = readJson<CityAggregates>(path);
      expect(generated).toEqual(committed);
    });
  }
});
