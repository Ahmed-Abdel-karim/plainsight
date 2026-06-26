"use client";

import { useMemo, type ReactNode } from "react";
import { createActorContext } from "@xstate/react";
import { useQueryClient } from "@tanstack/react-query";

import { makeLoadBrowsePoints } from "../shared/browse-points-query";
import { applyMapTheme } from "../shared/map-theme";
import { cityMachine } from "./machines/city/machine";
import { mapMachine } from "./machines/map/machine";
import { rootMachine } from "./machines/root/machine";
import { makePrefetch, type SnapshotById } from "./machines/root/prefetch";
import { RouteListener } from "./machines/navigation/route-listener";
import { SystemId } from "./machines/constants";

/**
 * SceneProvider is mounted by `app/(scene)/layout.tsx`, not the root app layout.
 * `createActorContext` creates one root actor for this provider lifetime: it
 * persists across city-to-city navigation inside `(scene)` and is torn down when
 * leaving the route group. The `city` machine is spawned fresh per slug from a
 * page-level `CITY.CHANGED` dispatch.
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
          // Inject the basemap label restyle so the map machine owns the timing
          // (MAP.STYLE_LOADED) without importing the map sub-domain's styles.
          map: mapMachine.provide({
            actions: {
              applyMapTheme: ({ context, event }) => {
                if (event.type !== "MAP.STYLE_LOADED") return;
                const map = context.mapRef?.getMap();
                if (map) applyMapTheme(map, event.theme);
              },
            },
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
