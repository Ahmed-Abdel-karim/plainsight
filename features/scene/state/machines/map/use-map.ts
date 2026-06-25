"use client";

import { useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { HexResolution } from "@/lib/hex/types";

import type { SourceId } from "@/features/scene/map/types";
import type { HexInspectInfo } from "./context";
import type { MapMachineActor } from "./machine";
import { SceneActorContext } from "../../provider";
import { createMachineStateSelector } from "../utils";

export type { HexInspectInfo };

function useMapActorRef(): MapMachineActor {
  return SceneActorContext.useSelector((s) => s.context.mapRef);
}

/** Stable send function for the map actor. Does not subscribe to snapshots. */
export function useMapSend() {
  return useMapActorRef().send;
}

// --- action hooks ---

/** Fires MAP.MOUNTED → MAP.READY → MAP.RESOLUTION_CHANGED in the required order. */
export function useReportMapLoaded() {
  const send = useMapSend();
  return useCallback(
    (mapRef: MapRef, hexResolution: HexResolution) => {
      send({ type: "MAP.MOUNTED", mapRef });
      send({ type: "MAP.READY" });
      send({ type: "MAP.RESOLUTION_CHANGED", hexResolution });
    },
    [send],
  );
}

export function useReportMapMounted() {
  const send = useMapSend();
  return useCallback(
    (mapRef: MapRef) => send({ type: "MAP.MOUNTED", mapRef }),
    [send],
  );
}

/** Drops the map ref when the canvas is torn down, so the session-persistent
 *  actor never operates on a removed MapLibre instance. */
export function useReportMapUnmounted() {
  const send = useMapSend();
  return useCallback(() => send({ type: "MAP.UNMOUNTED" }), [send]);
}

export function useReportMapReady() {
  const send = useMapSend();
  return useCallback(() => send({ type: "MAP.READY" }), [send]);
}

export function useReportMapError() {
  const send = useMapSend();
  return useCallback(() => send({ type: "MAP.ERROR" }), [send]);
}

export function useReportSourceLoaded() {
  const send = useMapSend();
  return useCallback(
    (sourceId: SourceId, loaded: boolean) =>
      send({ type: "MAP.SOURCE_LOADED", sourceId, loaded }),
    [send],
  );
}

/** Reports a MapLibre style (re)load so the machine re-applies label theming. */
export function useReportStyleLoaded() {
  const send = useMapSend();
  return useCallback(
    (theme: Theme) => send({ type: "MAP.STYLE_LOADED", theme }),
    [send],
  );
}

export function useChangeMapResolution() {
  const send = useMapSend();
  return useCallback(
    (hexResolution: HexResolution) =>
      send({ type: "MAP.RESOLUTION_CHANGED", hexResolution }),
    [send],
  );
}

export function useInspectHex() {
  const send = useMapSend();
  return useCallback(
    (info: HexInspectInfo | null) => send({ type: "MAP.HEX_INSPECT", info }),
    [send],
  );
}

export function useSetMapHover() {
  const send = useMapSend();
  return useCallback(
    (id: number | null, source: "list" | "map" | null) =>
      send({ type: "MAP.HOVER", id, source }),
    [send],
  );
}

// --- state selectors ---

const createMapSelector = createMachineStateSelector(useMapActorRef);

export const useMapIsReady = createMapSelector((s) =>
  s.matches({ lifecycle: "ready" }),
);

export const useMapIsSuppressed = createMapSelector((s) =>
  s.matches({ interaction: "suspended" }),
);

export const useMapIsError = createMapSelector((s) =>
  s.matches({ lifecycle: "error" }),
);

export const useMapRef = createMapSelector((s) => s.context.mapRef);

export const useHexResolution = createMapSelector(
  (s) => s.context.hexResolution,
);

export const useHexInspectInfo = createMapSelector(
  (s) => s.context.hexInspectInfo,
);

export const useIsSourceLoaded = createMapSelector.with(
  (s, id: SourceId) => !!s.context.loadedSources[id],
);
