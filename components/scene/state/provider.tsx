"use client";

import { useMemo, type ReactNode } from "react";
import { createActorContext } from "@xstate/react";
import { useQueryClient } from "@tanstack/react-query";

import type { NeighbourhoodBoundaries } from "@/lib/geo/types";
import { rootMachine } from "./machines/root/machine";
import { SystemId } from "./machines/constants";

/**
 * Scene actor system. `createActorContext` creates a single root actor for the
 * lifetime of this provider. When it is later mounted at `app/(scene)/layout.tsx`
 * (above the `/[city]` segment), the actor — and its persistent `map`/`ui`
 * children — survive city navigation; the `city` machine is spawned fresh per
 * slug from a page-level `CITY.CHANGED` dispatch.
 *
 * Not yet connected to the app: this file only sets up the context + provider.
 */
export const SceneActorContext = createActorContext(rootMachine);

export function SceneProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const logic = useMemo(
    () =>
      rootMachine.provide({
        actions: {
          prefetchCity: (_, { slug }: { slug: string }) => {
            // Prime the boundaries cache for the incoming city so the
            // neighbourhood layer doesn't wait on a cold fetch after the
            // city actor mounts. staleTime: Infinity (query defaults) means
            // a hit is instant if the user revisits the same city.
            void queryClient.prefetchQuery({
              queryKey: ["boundaries", slug],
              queryFn: async ({ signal }) => {
                const res = await fetch(`/api/cities/${slug}/boundaries`, {
                  signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return (await res.json()) as NeighbourhoodBoundaries;
              },
            });
          },
        },
      }),
    [queryClient],
  );

  return (
    <SceneActorContext.Provider
      logic={logic}
      options={{
        systemId: SystemId.ROOT,
      }}
    >
      {children}
    </SceneActorContext.Provider>
  );
}
