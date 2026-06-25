import { fetchJson } from "@/lib/fetch-json";
import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

import { cityAssetUrl } from "./city-asset-url";

/**
 * The single React Query descriptor for a city's neighbourhood boundaries tier
 * (the immutable `boundaries.geojson` public asset). Shared so the `useCityBoundaries`
 * hook and the navigation prefetch use one key + one fetch. Keyed by slug +
 * immutable snapshot id; the provider defaults give it `staleTime/gcTime: Infinity`.
 */
export function boundariesQueryOptions(slug: string, snapshotId: string) {
  return {
    queryKey: ["boundaries", slug, snapshotId] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchJson<NeighbourhoodBoundaries>(
        cityAssetUrl(slug, snapshotId, "boundaries"),
        { signal },
      ),
  };
}
