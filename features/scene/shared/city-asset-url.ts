const DEFAULT_ASSET_BASE_URL = "/city-assets";

const tierFiles = {
  analytics: "analytics.json",
  boundaries: "boundaries.geojson",
  points: "points.geojson",
} as const;

export type CityAssetTier = keyof typeof tierFiles;

function assetBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_CITY_ASSET_BASE_URL?.trim();
  return (configured || DEFAULT_ASSET_BASE_URL).replace(/\/+$/, "");
}

/** Builds the immutable public URL for one browser-facing snapshot tier. */
export function cityAssetUrl(
  slug: string,
  snapshotId: string,
  tier: CityAssetTier,
): string {
  return `${assetBaseUrl()}/${encodeURIComponent(slug)}/${encodeURIComponent(snapshotId)}/${tierFiles[tier]}`;
}
