import type { QueryClient } from "@tanstack/react-query";

import { boundariesQueryOptions } from "@/features/scene/shared/boundaries-query";
import { browsePointsQueryOptions } from "@/features/scene/shared/browse-points-query";
import { cityAssetUrl } from "@/features/scene/shared/city-asset-url";

import { SystemId } from "../constants";
import type { UiMachineActor } from "../ui/machine";
import type { WorkerMachineRef } from "../worker/machine";

/** Immutable slug → snapshot id index, seeded from the server cities list. */
export type SnapshotById = Record<string, string>;

interface PrefetchArgs {
  event: { type: string; path?: string };
  system: { get(id: string): unknown };
}

/**
 * Root `prefetch` action, closured over the slug→snapshot map and the app
 * `QueryClient` at the provider boundary so the machine stays free of a data
 * dependency. Fired on `NAV.STARTED` — which carries only the path, so the
 * snapshot is resolved from the map (Back/Forward navigations have no snapshot
 * ref). Warms the next city's tier *during* the nav window, ahead of the city
 * actor's own load; the later request dedupes against the cache this primed.
 *
 * Lens-gated to the resources that lens actually reads: analyse → the worker
 * listings load (hex/aggregates source), browse → the points tier. The active
 * lens is read off the session UI actor (the next city adopts it), never the
 * URL. Boundaries render in both lenses, so they are always warmed.
 */
export function makePrefetch(
  snapshotById: SnapshotById,
  queryClient: QueryClient,
) {
  return ({ event, system }: PrefetchArgs) => {
    if (event.type !== "NAV.STARTED" || !event.path) return;
    const slug = event.path.slice(1);
    const snapshotId = snapshotById[slug];
    if (!snapshotId) return;

    const lens =
      (system.get(SystemId.UI) as UiMachineActor | undefined)?.getSnapshot()
        .context.lens ?? "analyse";

    if (lens === "analyse") {
      const worker = system.get(SystemId.WORKER) as
        | WorkerMachineRef
        | undefined;
      // Resume before loading so the destination is warmed in active mode; the
      // spawned city still sends its own RESUME, so correctness never depends on
      // this earlier one (see docs/worker-machine-design.md, consumer contract).
      worker?.send({ type: "WORKER.RESUME" });
      worker?.send({
        type: "WORKER.REQUEST_LOAD",
        slug,
        snapshotId,
        assetUrl: cityAssetUrl(slug, snapshotId, "analytics"),
      });
    } else if (lens === "browse") {
      void queryClient.prefetchQuery(
        browsePointsQueryOptions(slug, snapshotId),
      );
    }

    void queryClient.prefetchQuery(boundariesQueryOptions(slug, snapshotId));
  };
}

export type PrefetchAction = ReturnType<typeof makePrefetch>;
