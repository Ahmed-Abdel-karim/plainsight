"use client";

import { useCallback } from "react";

import type { MapCityPayload } from "@/data/types";

import type { Input as CityInput } from "../city/input";
import { SceneActorContext } from "../../provider";

/**
 * Stable root actorRef. Does not subscribe to snapshots — use this when you
 * only need to call `.send()` or read `.system`.
 */
export function useRootRef() {
  return SceneActorContext.useActorRef();
}

/** Dispatch function for the root actor. Stable across renders. */
export function useRootSend() {
  return useRootRef().send;
}

export function useChangeCity() {
  const send = useRootSend();
  return useCallback(
    (payload: MapCityPayload, filter: CityInput["filter"]) =>
      send({ type: "CITY.CHANGED", payload, filter }),
    [send],
  );
}
