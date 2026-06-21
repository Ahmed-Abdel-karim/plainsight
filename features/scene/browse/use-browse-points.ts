"use client";

/**
 * Shared, lazy access to a city's versioned Browse points tier,
 * backed by React Query.
 *
 * Browse mounts the same surface twice (desktop sidebar + mobile drawer) and the
 * map needs the SAME parsed features for its dot source — a naive per-consumer
 * fetch would pull the multi-megabyte tier several times. A single `useQuery`
 * keyed by `["browse-points", slug, snapshotId]` solves that: every consumer shares one
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

import type {
  BrowseCollection,
  BrowsePoint,
  BrowsePointProperties,
} from "@/data/contract";
import type { ListingFilters, Scope, SortKey } from "@/data/types";
import { projectList } from "@/lib/listings/projection";

import { browsePointsQueryOptions } from "../shared/browse-points-query";

export type BrowsePointsStatus = "loading" | "ready" | "error";

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
  snapshotId: string,
  { enabled }: { enabled: boolean },
): UseBrowsePointsResult {
  const query = useQuery({
    ...browsePointsQueryOptions(slug, snapshotId),
    enabled: enabled && slug !== "" && snapshotId !== "",
  });

  const status: BrowsePointsStatus = query.isSuccess
    ? "ready"
    : query.isError
      ? "error"
      : "loading";
  return { status, collection: query.data ?? null };
}

/**
 * The filtered + sorted list rows for the active scope, filters, and sort key —
 * the same `projectList` the worker uses for Analyse, run live here over the
 * Browse points tier (`BrowsePointProperties`, a structural subset of `Listing`).
 * One projection backs both paths, so the list and the map dots can never
 * disagree with Analyse on what "the active set" is. Memoised; recomputes only
 * when scope/filters/sort change — ~30–60 ms over London's ~62k rows locally.
 *
 * `projectList` is the only import pulled from the projection module, so the
 * worker's hex/aggregate code tree-shakes out of the Browse chunk.
 */
export function useBrowseListings(
  collection: BrowseCollection | null,
  scope: Scope,
  filters: ListingFilters,
  sort: SortKey,
): BrowsePointProperties[] {
  return useMemo(() => {
    if (!collection) return [];
    const rows = collection.features.map(
      (feature: BrowsePoint) => feature.properties,
    );
    return projectList(rows, { scope, filters }, sort);
  }, [collection, scope, filters, sort]);
}
