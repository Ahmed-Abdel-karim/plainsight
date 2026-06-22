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

import { boundariesQueryOptions } from "./boundaries-query";

export function useCityBoundaries(
  slug: string | null,
  snapshotId: string | null,
): NeighbourhoodBoundaries | null {
  const query = useQuery({
    ...boundariesQueryOptions(slug ?? "", snapshotId ?? ""),
    enabled: !!slug && !!snapshotId,
  });

  return query.data ?? null;
}
