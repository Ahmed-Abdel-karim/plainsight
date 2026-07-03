"use client";

import { useCallback } from "react";

import { SceneActorContext } from "../../provider";
import { createMachineStateSelector } from "../utils";
import type { NavigationMachineActor } from "./machine";

function useNavigationRef() {
  const root = SceneActorContext.useActorRef();
  return root.getSnapshot().context.navigationRef as
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
    (path: string) => {
      nav?.send({ type: "NAV.COMMIT", path });
    },
    [nav],
  );
}

/**
 * Scene-session reset, dispatched to root. Wired to a layout-effect cleanup so it
 * fires when the scene subtree is Activity-hidden (navigation left `/city`),
 * quiescing the machines before `@xstate/react` snapshots them — so the preserved
 * snapshot rehydrates clean instead of stranding mid-load. See RouteListener.
 */
export function useSceneReset() {
  const root = SceneActorContext.useActorRef();
  return useCallback(() => {
    // No-op before any city exists: dev StrictMode runs the cleanup on the first
    // mount, and resetting a never-navigated scene is needless churn.
    if (root.getSnapshot().context.cityRef === null) return;
    root.send({ type: "SCENE.RESET" });
  }, [root]);
}

export const useIsNavigating = createNavSelector(
  (s) => s?.matches("navigating") ?? false,
);

export const usePendingSlug = createNavSelector((s) => {
  const path = s?.context.pendingPath ?? null;
  return path ? path.slice(1) : null;
});
