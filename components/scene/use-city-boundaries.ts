"use client";

/**
 * Lazy access to a city's neighbourhood boundaries GeoJSON
 * (`/api/cities/{slug}/boundaries`), backed by React Query — the same pattern as
 * `browse/use-browse-points`.
 *
 * The boundaries are the heavy (~1.8 MB) per-city tier. They stream lazily off
 * the route handler so the market panel never blocks on them, and one cache
 * entry keyed by `["boundaries", slug]` is shared by every consumer: the map's
 * neighbourhood layer, Browse, and listing detail. With `staleTime/gcTime:
 * Infinity` (provider defaults), revisiting a city is instant.
 *
 * Returns the collection (or `null` while pending / disabled).
 */
import { useQuery } from "@tanstack/react-query";

import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

export function useCityBoundaries(
  slug: string | null,
): NeighbourhoodBoundaries | null {
  const query = useQuery({
    queryKey: ["boundaries", slug],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/cities/${slug}/boundaries`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as NeighbourhoodBoundaries;
    },
    enabled: !!slug,
  });

  return query.data ?? null;
}
