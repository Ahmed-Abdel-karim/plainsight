"use client";

/**
 * Shared, lazy access to a city's Browse tier (`/api/cities/{slug}/points`),
 * backed by React Query.
 *
 * Browse mounts the same surface twice (desktop sidebar + mobile drawer) and the
 * map needs the SAME parsed features for its dot source — a naive per-consumer
 * fetch would pull the multi-megabyte tier several times. A single `useQuery`
 * keyed by `["browse-points", slug]` solves that: every consumer shares one
 * cache entry and one in-flight request (dedup), and gets the shared retry +
 * `staleTime/gcTime: Infinity` defaults from the provider (`@/lib/query/config`).
 *
 * It is **lazy**: `enabled` gates the fetch to when Browse is active for the
 * slug. The collection is cached for the session (the tier is static, stale time
 * is Infinity), so toggling Analyse↔Browse never re-fetches. The listings
 * worker is untouched because Browse only needs the pre-built points tier.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { BrowsePoint, BrowsePointProperties } from "@/data/contract";
import type { ListingFilters, Scope, SortKey } from "@/data/types";
import { filterListings, sortListings } from "@/lib/filters";

export type BrowsePointsStatus = "loading" | "ready" | "error";

export type BrowseCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  BrowsePointProperties
>;

export interface UseBrowsePointsResult {
  status: BrowsePointsStatus;
  collection: BrowseCollection | null;
}

/**
 * The shared points collection for `slug` while `enabled`, with its load status.
 * While `loading` the list shows a skeleton and the map draws no dots; on
 * `error` the lens still toggles and the list shows the empty/error affordance.
 *
 * The geojson is a client-only fetch gated by `enabled`, so the server render and
 * the first client render are both `pending` ⇒ `"loading"` — the Browse slot
 * hydrates identically on both sides. The React Query status maps onto the small
 * `{ status, collection }` shape every consumer already reads.
 */
export function useBrowsePoints(
  slug: string,
  { enabled }: { enabled: boolean },
): UseBrowsePointsResult {
  const query = useQuery({
    queryKey: ["browse-points", slug],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/cities/${slug}/points`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as BrowseCollection;
    },
    enabled: enabled && slug !== "",
  });

  const status: BrowsePointsStatus = query.isSuccess
    ? "ready"
    : query.isError
      ? "error"
      : "loading";
  return { status, collection: query.data ?? null };
}

/**
 * The filtered + sorted list rows for the active scope, filters, and sort key.
 * Memoised: features → scope narrow → `filterListings` (price/room) →
 * `sortListings` (the shared comparator). Recomputes only when one of those
 * changes — ~30–60 ms over London's ~62k listings in local profiling.
 */
export function useBrowseListings(
  collection: BrowseCollection | null,
  scope: Scope,
  filters: ListingFilters,
  sort: SortKey,
): BrowsePointProperties[] {
  const scopeId = scope.type === "neighbourhood" ? scope.id : null;
  return useMemo(() => {
    if (!collection) return [];
    const rows = collection.features.map(
      (feature: BrowsePoint) => feature.properties,
    );
    // Scope narrow — the live twin of `scopeListings` (a single equality, kept
    // inline so the Browse chunk doesn't pull the worker's hex aggregation).
    const scoped =
      scopeId === null
        ? rows
        : rows.filter((row) => row.neighbourhoodId === scopeId);
    return sortListings(filterListings(scoped, filters), sort);
  }, [collection, scopeId, filters, sort]);
}
