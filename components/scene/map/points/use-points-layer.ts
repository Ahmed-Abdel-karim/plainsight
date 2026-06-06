"use client";

/**
 * Imperative bridge for the Browse dot layer's **feature-state** — the recolour/
 * resize channel MapLibre exposes without re-issuing source data. It mirrors the
 * shared hovered id (from the list or the map) and the selected listing (from the
 * URL) onto the dots as `{ hover }` / `{ selected }` feature-state, keyed by the
 * promoted listing id. The GPU `filter` and the source data are owned
 * declaratively by `PointsLayer`; only this hover/selected emphasis is imperative.
 */
import { useEffect, useRef } from "react";

import { POINTS_SOURCE_ID } from "../constants";
import { useMapRef } from "../map-store";

export function usePointsFeatureState({
  hoveredId,
  selectedId,
  enabled,
}: {
  hoveredId: number | null;
  selectedId: number | null;
  enabled: boolean;
}) {
  const mapRef = useMapRef();
  const prevHover = useRef<number | null>(null);
  const prevSelected = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef;
    if (!map) return;

    const apply = () => {
      if (!map.getSource(POINTS_SOURCE_ID)) return;
      const set = (id: number, state: Record<string, boolean>) => {
        try {
          map.setFeatureState({ source: POINTS_SOURCE_ID, id }, state);
        } catch {
          /* source not ready for this id yet — re-applied on the next idle */
        }
      };

      const nextHover = enabled ? hoveredId : null;
      if (prevHover.current !== nextHover) {
        if (prevHover.current !== null)
          set(prevHover.current, { hover: false });
        if (nextHover !== null) set(nextHover, { hover: true });
        prevHover.current = nextHover;
      }

      const nextSelected = enabled ? selectedId : null;
      if (prevSelected.current !== nextSelected) {
        if (prevSelected.current !== null)
          set(prevSelected.current, { selected: false });
        if (nextSelected !== null) set(nextSelected, { selected: true });
        prevSelected.current = nextSelected;
      }
    };

    apply();
    // The source may still be loading on first Browse activation / deep-link —
    // re-apply once the map next goes idle so the selected dot emphasis lands.
    if (enabled && (hoveredId !== null || selectedId !== null)) {
      map.once("idle", apply);
      return () => {
        map.off("idle", apply);
      };
    }
  }, [mapRef, hoveredId, selectedId, enabled]);
}
