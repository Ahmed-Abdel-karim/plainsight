import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bench, describe } from "vitest";

import type {
  BrowseCollection,
  BrowsePointProperties,
  CityManifest,
  CityMeta,
  Listing,
} from "@/data/contract";
import type { ListingFilters, SortKey } from "@/data/types";
import type { HexResolution } from "@/lib/hex/types";
import {
  projectBrowseListings,
  projectCityHexes,
  projectScopeStats,
  type ResolvedListingSelection,
} from "@/lib/listings";

const ROOT = process.cwd();
const CITY = "london";
const EXPECTED_LONDON_ROWS = 61_963;
const RESOLUTION: HexResolution = 6;
const BENCH_OPTIONS = {
  time: 2_000,
  iterations: 100,
  warmupTime: 250,
} as const;
const PARSE_BENCH_OPTIONS = {
  time: 2_000,
  iterations: 50,
  warmupTime: 250,
} as const;
const BROWSE_BENCH_OPTIONS = {
  time: 2_000,
  iterations: 200,
  warmupTime: 250,
} as const;
const WARMUP_ITERATIONS = 3;

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8")) as T;
}

function loadLondonAnalytics(): {
  listings: Listing[];
  meta: CityMeta;
  assetPath: string;
  assetText: string;
  assetBytes: number;
} {
  const manifest = readJson<CityManifest>("data/snapshots/manifest.json");
  const city = manifest.cities.find(({ slug }) => slug === CITY);
  if (!city) throw new Error(`Missing ${CITY} entry in the city manifest`);
  if (city.listingCount !== EXPECTED_LONDON_ROWS) {
    throw new Error(
      `London manifest declares ${city.listingCount} rows; expected ${EXPECTED_LONDON_ROWS}`,
    );
  }

  const assetPath = `public/city-assets/${CITY}/${city.snapshotId}/analytics.json`;
  const assetText = readFileSync(join(ROOT, assetPath), "utf8");
  const listings = JSON.parse(assetText) as Listing[];
  if (listings.length !== EXPECTED_LONDON_ROWS) {
    throw new Error(
      `${assetPath} contains ${listings.length} rows; expected ${EXPECTED_LONDON_ROWS}`,
    );
  }

  return {
    listings,
    meta: readJson<CityMeta>(
      `data/snapshots/${CITY}/${city.snapshotId}/meta.json`,
    ),
    assetPath,
    assetText,
    assetBytes: Buffer.byteLength(assetText, "utf8"),
  };
}

interface BenchmarkScenario {
  readonly name: string;
  readonly filters: ListingFilters;
}

interface BrowseBenchmarkScenario extends BenchmarkScenario {
  readonly sort: SortKey;
}

const { listings, meta, assetPath, assetText, assetBytes } =
  loadLondonAnalytics();
const browseAssetPath = `public/city-assets/${CITY}/${meta.snapshotId}/points.geojson`;
const browseCollection = readJson<BrowseCollection>(browseAssetPath);
if (browseCollection.features.length !== EXPECTED_LONDON_ROWS) {
  throw new Error(
    `${browseAssetPath} contains ${browseCollection.features.length} features; expected ${EXPECTED_LONDON_ROWS}`,
  );
}
const browseRows: BrowsePointProperties[] = browseCollection.features.map(
  (feature) => feature.properties,
);

console.info(
  `Loaded ${listings.length.toLocaleString("en-US")} London analytics rows from ${assetPath}`,
);
console.info(
  `Analytics asset: ${(assetBytes / 1_000_000).toFixed(2)} MB (${assetBytes.toLocaleString("en-US")} UTF-8 bytes)`,
);
console.info(
  `Loaded ${browseRows.length.toLocaleString("en-US")} London Browse point properties from ${browseAssetPath}`,
);
console.info(`Hex resolution: ${RESOLUTION} (the app's overview default)`);

const defaultFilters: ListingFilters = {
  roomTypes: [],
  priceRange: [meta.priceScale.min, Infinity],
};
const filteredFilters: ListingFilters = {
  roomTypes: ["Entire home/apt"],
  priceRange: [75, 200],
};

const analyseScenarios: readonly BenchmarkScenario[] = [
  {
    name: "whole-city, no filters",
    filters: defaultFilters,
  },
  {
    name: "filtered: entire home/apt, £75–£200",
    filters: filteredFilters,
  },
];

const browseScenarios: readonly BrowseBenchmarkScenario[] = [
  {
    name: "whole-city, no filters, price ascending",
    filters: defaultFilters,
    sort: "price_asc",
  },
  {
    name: "filtered: entire home/apt, £75–£200, reviews/month descending",
    filters: filteredFilters,
    sort: "reviews_desc",
  },
];

function selection(filters: ListingFilters): ResolvedListingSelection {
  return { neighbourhood: null, filters };
}

function warmUp(filters: ListingFilters): void {
  const selected = selection(filters);
  for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
    projectCityHexes(listings, filters, RESOLUTION);
    projectScopeStats(listings, selected, meta.priceCap);
    projectCityHexes(listings, filters, RESOLUTION);
    projectScopeStats(listings, selected, meta.priceCap);
  }
}

for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
  JSON.parse(assetText) as Listing[];
}

describe("one-time city load", () => {
  bench(
    "JSON.parse analytics rows",
    () => {
      JSON.parse(assetText) as Listing[];
    },
    PARSE_BENCH_OPTIONS,
  );
});

for (const scenario of analyseScenarios) {
  warmUp(scenario.filters);
  const selected = selection(scenario.filters);

  describe(scenario.name, () => {
    bench(
      "hex layer",
      () => {
        projectCityHexes(listings, scenario.filters, RESOLUTION);
      },
      BENCH_OPTIONS,
    );

    bench(
      "market summary",
      () => {
        projectScopeStats(listings, selected, meta.priceCap);
      },
      BENCH_OPTIONS,
    );

    bench(
      "full recompute",
      () => {
        projectCityHexes(listings, scenario.filters, RESOLUTION);
        projectScopeStats(listings, selected, meta.priceCap);
      },
      BENCH_OPTIONS,
    );
  });
}

for (const scenario of browseScenarios) {
  const selected = selection(scenario.filters);
  for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
    projectBrowseListings(browseRows, selected, scenario.sort);
  }

  describe(`Browse: ${scenario.name}`, () => {
    bench(
      "filter + sort",
      () => {
        projectBrowseListings(browseRows, selected, scenario.sort);
      },
      BROWSE_BENCH_OPTIONS,
    );
  });
}
