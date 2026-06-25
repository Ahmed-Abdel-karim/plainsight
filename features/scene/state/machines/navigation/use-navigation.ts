"use client";

import { useCallback } from "react";

import { SceneActorContext } from "../../provider";
import { SystemId } from "../constants";
import { createMachineStateSelector } from "../utils";
import type { NavigationMachineActor } from "./machine";

function useNavigationRef() {
  const root = SceneActorContext.useActorRef();
  return root.system.get(SystemId.NAVIGATION) as
    | NavigationMachineActor
    | undefined;
}

const createNavSelector = createMachineStateSelector(useNavigationRef);

/** Eager city-switch intent — sends NAV.INTENT for the target route. */
export function useStartNav() {
  const nav = useNavigationRef();
  return useCallback(
    (slug: string) => nav?.send({ type: "NAV.INTENT", path: `/${slug}` }),
    [nav],
  );
}

/** Route source — sends NAV.COMMIT for the current pathname. */
export function useCommitRoute() {
  const nav = useNavigationRef();
  return useCallback(
    (path: string) => nav?.send({ type: "NAV.COMMIT", path }),
    [nav],
  );
}

export const useIsNavigating = createNavSelector(
  (s) => s?.matches("navigating") ?? false,
);

export const usePendingSlug = createNavSelector((s) => {
  const path = s?.context.pendingPath ?? null;
  return path ? path.slice(1) : null;
});
