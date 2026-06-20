"use client";

import { useCallback } from "react";

import type { MapCityPayload } from "@/data/types";

import type { Input as CityInput } from "../city/input";
import { SceneActorContext } from "../../provider";

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

export function useStartNav() {
  const send = useRootSend();
  return useCallback(
    (slug: string) => send({ type: "NAV.START", slug }),
    [send],
  );
}

export function useChangeCity() {
  const send = useRootSend();
  return useCallback(
    (payload: MapCityPayload, filter: CityInput["filter"]) =>
      send({ type: "CITY.CHANGED", payload, filter }),
    [send],
  );
}

// --- state selectors ---

/**
 * True while root is in `running.navigating` — a city switch is in flight,
 * between `NAV.START` and the incoming city's `CITY.READY`. The map already
 * derives its own dim from `useMapIsSuppressed`; use this for nav-pending
 * affordances elsewhere (e.g. the city switcher) that the map styling doesn't cover.
 */
export function useIsNavigating() {
  return SceneActorContext.useSelector((s) =>
    s.matches({ running: "navigating" }),
  );
}

/**
 * The slug being navigated to while `navigating`, else `null`. Stamped at
 * `NAV.START` (latest-wins on a re-click), cleared at `CITY.READY`.
 */
export function usePendingSlug() {
  return SceneActorContext.useSelector((s) => s.context.pendingSlug);
}
