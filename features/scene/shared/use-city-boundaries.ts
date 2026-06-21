"use client";

/**
 * Lazy access to a city's neighbourhood boundaries GeoJSON
 * (the immutable `boundaries.geojson` public asset), backed by React Query — the same pattern as
 * `browse/use-browse-points`.
 *
 * The boundaries are the heavy (~1.8 MB) per-city tier. They stream lazily off
 * public storage so the market panel never blocks on them, and one cache
 * entry keyed by `["boundaries", slug, snapshotId]` is shared by every consumer: the map's
 * neighbourhood layer, Browse, and listing detail. With `staleTime/gcTime:
 * Infinity` (provider defaults), revisiting a city is instant.
 *
 * Returns the collection (or `null` while pending / disabled).
 */
import { useQuery } from "@tanstack/react-query";

import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

import { cityAssetUrl } from "./city-asset-url";

export function useCityBoundaries(
  slug: string | null,
  snapshotId: string | null,
): NeighbourhoodBoundaries | null {
  const query = useQuery({
    queryKey: ["boundaries", slug, snapshotId],
    queryFn: async ({ signal }) => {
      const res = await fetch(cityAssetUrl(slug!, snapshotId!, "boundaries"), {
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as NeighbourhoodBoundaries;
    },
    enabled: !!slug && !!snapshotId,
  });

  return query.data ?? null;
}
