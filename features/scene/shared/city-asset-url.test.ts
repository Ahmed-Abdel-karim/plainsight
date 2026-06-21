import { afterEach, describe, expect, it, vi } from "vitest";

import { cityAssetUrl } from "./city-asset-url";

describe("cityAssetUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds a same-origin immutable snapshot URL by default", () => {
    vi.stubEnv("NEXT_PUBLIC_CITY_ASSET_BASE_URL", "");

    expect(cityAssetUrl("london", "2025-09", "points")).toBe(
      "/city-assets/london/2025-09/points.geojson",
    );
  });

  it("uses a configured CDN base without duplicating its trailing slash", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_CITY_ASSET_BASE_URL",
      "https://cdn.example.com/plainsight/",
    );

    expect(cityAssetUrl("berlin", "2025-09", "analytics")).toBe(
      "https://cdn.example.com/plainsight/berlin/2025-09/analytics.json",
    );
  });
});
