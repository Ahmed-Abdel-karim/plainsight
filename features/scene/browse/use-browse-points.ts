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
import type { ListingFilters, SortKey } from "@/data/types";
import { listingsFor } from "@/lib/listings";

import { browsePointsQueryOptions } from "../shared/browse-points-query";

export type BrowsePointsStatus = "loading" | "ready" | "error";

export interface UseBrowsePointsResult {
  status: BrowsePointsStatus;
  collection: BrowseCollection | null;
}

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

export function useBrowseListings(
  collection: BrowseCollection | null,
  neighbourhood: string | null,
  filters: ListingFilters,
  sort: SortKey,
): BrowsePointProperties[] {
  const rows = useMemo(
    () =>
      collection?.features.map((feature: BrowsePoint) => feature.properties),
    [collection],
  );
  return useMemo(() => {
    if (!rows) return [];
    return listingsFor(rows, { neighbourhood, filters }, sort);
  }, [rows, neighbourhood, filters, sort]);
}

export function useListingsByIndex(
  listings: BrowsePointProperties[],
): Map<number, number> {
  return useMemo(
    () => new Map(listings.map((listing, index) => [listing.id, index])),
    [listings],
  );
}
