import { type QueryClient } from "@tanstack/react-query";
import { fromPromise } from "xstate";

import type { BrowseCollection } from "@/data/contract";

import { cityAssetUrl } from "./city-asset-url";

/**
 * The single React Query descriptor for a city's Browse tier
 * (the immutable `points.geojson` public asset). Shared so every reader uses one key + one
 * fetch: the `useBrowsePoints` hook (list / detail / map dots) and the city
 * machine's `loadBrowsePoints` actor. Keyed by slug + immutable snapshot id; the provider defaults give
 * it `staleTime/gcTime: Infinity`, so toggling lenses never refetches.
 */
export function browsePointsQueryOptions(slug: string, snapshotId: string) {
  return {
    queryKey: ["browse-points", slug, snapshotId] as const,
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      const res = await fetch(cityAssetUrl(slug, snapshotId, "points"), {
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as BrowseCollection;
    },
  };
}

/**
 * The city machine's `loadBrowsePoints` actor, closured over the app
 * `QueryClient` so it warms (and dedups against) the same cache the hook reads.
 * Injected at the provider boundary (`SceneProvider` / test render), so the
 * machine stays free of a React/data dependency.
 */
export function makeLoadBrowsePoints(queryClient: QueryClient) {
  return fromPromise<BrowseCollection, { slug: string; snapshotId: string }>(
    ({ input }) =>
      queryClient.fetchQuery(
        browsePointsQueryOptions(input.slug, input.snapshotId),
      ),
  );
}

export type LoadBrowsePointsActor = ReturnType<typeof makeLoadBrowsePoints>;
