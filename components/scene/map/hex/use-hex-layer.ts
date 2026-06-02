"use client";

/**
 * Bridge between the listings worker and the hex map layer. Because the default
 * scene view *is* the hex price map, this acquires the shared worker eagerly on
 * scene entry (via the ref-counted `use-city-listings` registry) — not lazily on
 * first filter like the sidebar cards. It re-queries `client.hexes(filters,
 * resolution)` whenever the active filter state (URL) or the zoom-derived
 * resolution (map store) changes, and writes the resulting cells to the store
 * for `HexLayer` to render. Only the small `HexCell[]` ever crosses the worker
 * boundary; nothing is recomputed on the main thread.
 */
import { useEffect } from "react";

import { useCityListings } from "@/components/scene/use-city-listings";

import { useFilters, type FilterBounds } from "../../analysis/use-filters";
import { useHexResolution, useMapActions } from "../map-store";

export function useHexLayer({
  slug,
  bounds,
  enabled,
}: {
  slug: string;
  bounds: FilterBounds;
  enabled: boolean;
}) {
  // Eager: the hex map is the default view, so the worker (and its analytics
  // fetch) spins up as soon as the scene has a city.
  const client = useCityListings(slug, { enabled });
  const resolution = useHexResolution();
  const { filters } = useFilters(bounds);
  const { setHexCells } = useMapActions();

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    client.ready
      .then(() => client.hexes(filters, resolution))
      .then((cells) => {
        if (!cancelled) setHexCells(cells);
      })
      .catch(() => {
        /* leave the last good cells in place on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [client, filters, resolution, setHexCells]);
}
