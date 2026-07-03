"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { useCommitRoute, useSceneReset } from "./use-navigation";

// Route source: usePathname reacts to every navigation — <Link>, router.push,
// and browser Back/Forward — plus the initial mount (cold-start commit). Each
// change is sent to the navigation actor as NAV.COMMIT.
export function RouteListener() {
  const pathname = usePathname();
  const commit = useCommitRoute();
  const reset = useSceneReset();
  useEffect(() => {
    commit(pathname);
  }, [pathname, commit]);
  // When `cacheComponents` hides this scene subtree with <Activity> (navigation
  // left `/city`), reset the session before @xstate/react snapshots the actor
  // tree. A layout-effect cleanup runs synchronously on hide, ahead of the
  // provider's passive stop/rehydrate, so the persisted snapshot is already clean.
  useLayoutEffect(() => reset, [reset]);
  return null;
}
