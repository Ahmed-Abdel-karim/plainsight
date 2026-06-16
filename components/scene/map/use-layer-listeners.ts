"use client";

import { useEffect, useRef } from "react";

import type { LayerId } from "./types";
import type { LayerListeners } from "./types";
import { useMapRef } from "../state";
import { useMapControls } from "./use-map-controls";

/**
 * Subscribe a layer's pointer listeners to the map, re-subscribing only when the
 * layer, map, enabled flag, or the *set* of event types changes — never on
 * listener identity. The latest `listeners` live in a ref that stable wrappers
 * read from, so callers pass a fresh object each render without memoizing every
 * handler.
 */
export function useLayerListeners(
  layerId: LayerId,
  listeners: LayerListeners,
  enabled = true,
): void {
  const mapRef = useMapRef();
  const { setLayerListeners } = useMapControls();
  const listenersRef = useRef(listeners);
  const eventTypes = (Object.keys(listeners) as (keyof LayerListeners)[])
    .sort()
    .join(",");

  useEffect(() => {
    listenersRef.current = listeners;
  });

  useEffect(() => {
    if (!mapRef || !enabled) return;
    const wrapped = Object.fromEntries(
      eventTypes
        .split(",")
        .filter(Boolean)
        .map((eventType) => [
          eventType,
          (event: never) =>
            listenersRef.current[eventType as keyof LayerListeners]?.(event),
        ]),
    ) as LayerListeners;
    const subscriptions = setLayerListeners({ layerId, listeners: wrapped });
    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [enabled, eventTypes, layerId, mapRef, setLayerListeners]);
}
