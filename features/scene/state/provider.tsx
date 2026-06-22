"use client";

import { useMemo, type ReactNode } from "react";
import { createActorContext } from "@xstate/react";
import { useQueryClient } from "@tanstack/react-query";

import { makeLoadBrowsePoints } from "../shared/browse-points-query";
import { cityMachine } from "./machines/city/machine";
import { rootMachine } from "./machines/root/machine";
import { makePrefetch, type SnapshotById } from "./machines/root/prefetch";
import { RouteListener } from "./machines/navigation/route-listener";
import { SystemId } from "./machines/constants";

/**
 * Scene actor system. `createActorContext` creates a single root actor for the
 * lifetime of this provider. Mounted in the root `app/layout.tsx` (above the
 * `(scene)` segment), the actor — and its persistent `map`/`ui`/`worker`
 * children — survive *all* navigation, including the trip out to the home
 * picker; the `city` machine is spawned fresh per slug from a page-level
 * `CITY.CHANGED` dispatch.
 */
export const SceneActorContext = createActorContext(rootMachine);

export function SceneProvider({
  children,
  snapshotById,
}: {
  children: ReactNode;
  snapshotById: SnapshotById;
}) {
  const queryClient = useQueryClient();

  const logic = useMemo(
    () =>
      rootMachine.provide({
        actions: { prefetch: makePrefetch(snapshotById, queryClient) },
        actors: {
          // Inject the points loader closured over the app QueryClient so the
          // city machine itself stays free of a data dependency.
          city: cityMachine.provide({
            actors: { ensureBrowseReady: makeLoadBrowsePoints(queryClient) },
          }),
        },
      }),
    [queryClient, snapshotById],
  );

  return (
    <SceneActorContext.Provider
      logic={logic}
      options={{
        systemId: SystemId.ROOT,
      }}
    >
      <RouteListener />
      {children}
    </SceneActorContext.Provider>
  );
}
