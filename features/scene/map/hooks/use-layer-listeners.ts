"use client";

import { useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerEventType, Subscription } from "maplibre-gl";

import type { LayerId } from "../types";
import type { LayerListeners } from "../types";
import { useMapRef } from "../../state";

type LayerEventType = keyof MapLayerEventType;

function registerLayerListener<T extends LayerEventType>(
  mapRef: MapRef,
  layerId: LayerId,
  eventType: T,
  listener: LayerListeners[T],
): Subscription | undefined {
  if (!listener) return;
  return mapRef.on(eventType, layerId, listener);
}

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
    const subscriptions = (Object.keys(wrapped) as LayerEventType[])
      .map((eventType) =>
        registerLayerListener(mapRef, layerId, eventType, wrapped[eventType]),
      )
      .filter((s): s is Subscription => !!s);
    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [enabled, eventTypes, layerId, mapRef]);
}
