"use client";

import { useEffect, useRef } from "react";

import type { LayerId } from "./types";
import { type LayerListeners, useMapActions, useMapRef } from "../stores";

/**
 * Subscribe a layer's pointer listeners to the map, re-subscribing only when the
 * layer or map changes — never on listener identity. The latest `listeners` live
 * in a ref that stable wrappers read from, so callers pass a fresh object each
 * render without having to memoize every handler.
 */
export function useLayerListeners(
  layerId: LayerId,
  listeners: LayerListeners,
  enabled = true,
): void {
  const mapRef = useMapRef();
  const { setLayerListeners, removeEventListeners } = useMapActions();
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
    setLayerListeners({ layerId, listeners: wrapped });

    return () => removeEventListeners(layerId);
  }, [
    enabled,
    eventTypes,
    layerId,
    mapRef,
    removeEventListeners,
    setLayerListeners,
  ]);
}
