import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Serves the per-city static tiers from the server-only `data/cities/` store
 * (the same files `data/repository/static-json.ts` reads from disk) over the
 * `/api/cities/...` route handlers.
 *
 * Files are deliberately NOT in `public/` — the route handler is the only client
 * path in, so we own the caching + version semantics: a content-hash `ETag` plus
 * `must-revalidate`, with no URL versioning. The client stays version-agnostic; a
 * data change ships via redeploy → new ETag → clients revalidate (`304` when
 * unchanged, fresh `200` when not).
 *
 * Each file is read + hashed once and cached in module scope, reused across warm
 * invocations (the files are immutable within a deployment), so a request only
 * pays the read on a cold start.
 */

const DATA_DIR = join(process.cwd(), "data", "cities");

const GEOJSON = "application/geo+json";
const JSON_CT = "application/json";

interface TierSpec {
  filename: (slug: string) => string;
  contentType: string;
}

/**
 * The tier allowlist. Mapping a tier here is the ONLY way to expose a file, so it
 * doubles as the guard against arbitrary-path reads — an unknown tier 404s before
 * any filesystem access.
 */
export const CITY_TIERS = {
  points: { filename: (s) => `${s}-points.geojson`, contentType: GEOJSON },
  boundaries: {
    filename: (s) => `${s}-boundaries.geojson`,
    contentType: GEOJSON,
  },
  analytics: { filename: (s) => `${s}-analytics.json`, contentType: JSON_CT },
  listings: { filename: (s) => `${s}-listings.json`, contentType: JSON_CT },
  meta: { filename: (s) => `${s}-meta.json`, contentType: JSON_CT },
  aggregates: { filename: (s) => `${s}-aggregates.json`, contentType: JSON_CT },
} satisfies Record<string, TierSpec>;

export type CityTier = keyof typeof CITY_TIERS;

const CACHE_CONTROL = "public, max-age=0, must-revalidate";

interface CachedFile {
  body: Buffer;
  etag: string;
}

// Keyed by filename — read body + computed ETag, reused across warm invocations.
const fileCache = new Map<string, Promise<CachedFile | null>>();

async function readAndHash(filename: string): Promise<CachedFile | null> {
  try {
    const body = await readFile(join(DATA_DIR, filename));
    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
    return { body, etag };
  } catch {
    return null;
  }
}

function loadFile(filename: string): Promise<CachedFile | null> {
  let entry = fileCache.get(filename);
  if (!entry) {
    entry = readAndHash(filename);
    fileCache.set(filename, entry);
  }
  return entry;
}

/** Serve one file by name, handling `If-None-Match` → `304`. */
export async function serveFile(
  filename: string,
  contentType: string,
  request: Request,
): Promise<Response> {
  const file = await loadFile(filename);
  if (!file) return new Response("Not found", { status: 404 });

  const headers: HeadersInit = {
    ETag: file.etag,
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": contentType,
  };

  if (request.headers.get("if-none-match") === file.etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(new Uint8Array(file.body), { headers });
}

// Slugs come from the index (`cities.json`); this is a defensive guard so a tier
// is only ever joined with a flat, lowercase slug — never a traversal sequence.
const SLUG = /^[a-z0-9-]+$/;

/** Serve a city tier, validating both the slug and the tier allowlist. */
export function serveTier(
  slug: string,
  tier: string,
  request: Request,
): Promise<Response> {
  const spec = (CITY_TIERS as Record<string, TierSpec>)[tier];
  if (!spec || !SLUG.test(slug)) {
    return Promise.resolve(new Response("Not found", { status: 404 }));
  }
  return serveFile(spec.filename(slug), spec.contentType, request);
}
