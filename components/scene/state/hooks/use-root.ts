"use client";

import { useCallback } from "react";

import type { MapCityPayload } from "@/data/types";
import { SceneActorContext } from "../provider";

/**
 * Stable root actorRef. Does not subscribe to snapshots — use this when you
 * only need to call `.send()` or read `.system`, not when you need reactive
 * state from the root machine.
 */
export function useRootRef() {
  return SceneActorContext.useActorRef();
}

/**
 * Dispatch function for the root actor. Stable across renders (same reference
 * as `actorRef.send`). Use to send `CITY.CHANGED`, `NAV.START`, etc.
 */
export function useRootSend() {
  return useRootRef().send;
}

// --- action hooks ---

export function useNavStart() {
  const send = useRootSend();
  return useCallback(
    (slug: string) => send({ type: "NAV.START", slug }),
    [send],
  );
}

export function useDispatchCityChanged() {
  const send = useRootSend();
  return useCallback(
    (payload: MapCityPayload) => send({ type: "CITY.CHANGED", payload }),
    [send],
  );
}

// useIsNavigating() / usePendingSlug() are added once root gains
// the `navigating` sub-state and `pendingSlug` context field.
