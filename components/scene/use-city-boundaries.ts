"use client";

/**
 * Lazy access to a city's neighbourhood boundaries GeoJSON
 * (`/api/cities/{slug}/boundaries`), backed by React Query — the same pattern as
 * `browse/use-browse-points`.
 *
 * The boundaries are the heavy (~1.8 MB) per-city tier. They used to be fetched
 * server-side and serialized down through props into the cityData store; now they
 * stream lazily off the route handler so the sidebar never blocks on them, and a
 * single cache entry keyed by `["boundaries", slug]` is shared by every consumer
 * (the map's neighbourhoods layer, plus the Browse list/detail that resolve a
 * neighbourhood id → name). The map gates the fetch by pushing its slug into the
 * map store (`cityBoundaryKey`); the `/city` consumers pass their own slug. With
 * `staleTime/gcTime: Infinity` (provider defaults) a revisit is instant.
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
