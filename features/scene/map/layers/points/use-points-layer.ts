"use client";

/**
 * Imperative bridge for the Browse dot layer's **feature-state** — the recolour/
 * resize channel MapLibre exposes without re-issuing source data. It reads the
 * shared hovered id (from the list or the map) and the selected listing from the
 * actor system, then mirrors them onto the dots as `{ hover }` / `{ selected }`
 * feature-state, keyed by the promoted listing id. The GPU `filter` and source
 * data are owned declaratively by `PointsLayers`; only this emphasis is
 * imperative.
 */
import { useCallback, useEffect, useRef } from "react";

import { POINTS_SOURCE_ID } from "../../constants";
import {
  useHoveredListingId,
  useIsSourceLoaded,
  useMapRef,
  useSelectedId,
} from "@/features/scene/state";

export function usePointsFeatureState(enabled: boolean) {
  const mapRef = useMapRef();
  const setFeatureState = useCallback(
    (id: number, state: Record<string, boolean>) => {
      mapRef
        ?.getMap()
        ?.setFeatureState({ source: POINTS_SOURCE_ID, id }, state);
    },
    [mapRef],
  );
  const hoveredId = useHoveredListingId();
  const selectedId = useSelectedId();
  const loaded = useIsSourceLoaded(POINTS_SOURCE_ID);
  const prevHover = useRef<number | null>(null);
  const prevSelected = useRef<number | null>(null);

  useEffect(() => {
    // The source's feature-state is wiped whenever its data (re)loads — e.g. a
    // filter/city swap. While it's unloaded there's nothing to paint onto, so we
    // forget what we wrote; the false→true edge below then re-applies from
    // scratch once parsing finishes.
    if (!loaded) {
      prevHover.current = null;
      prevSelected.current = null;
      return;
    }

    // Diff the last-written id against the next so we don't repaint dots that
    // already hold the right state.
    const nextHover = enabled ? hoveredId : null;
    if (prevHover.current !== nextHover) {
      if (prevHover.current !== null)
        setFeatureState(prevHover.current, { hover: false });
      if (nextHover !== null) setFeatureState(nextHover, { hover: true });
      prevHover.current = nextHover;
    }

    const nextSelected = enabled ? selectedId : null;
    if (prevSelected.current !== nextSelected) {
      if (prevSelected.current !== null)
        setFeatureState(prevSelected.current, { selected: false });
      if (nextSelected !== null)
        setFeatureState(nextSelected, { selected: true });
      prevSelected.current = nextSelected;
    }
  }, [loaded, setFeatureState, hoveredId, selectedId, enabled]);
}
