"use client";

import { useEffect } from "react";

import { type MapCityPayload, useMapActions } from "../stores";

/**
 * Server pages can't pass props *up* to the parent `(scene)` layout that owns the
 * persistent map, so this client bridge carries the current city's data into the
 * shared map store instead. It renders nothing — the city page mounts it with the
 * same serializable values it already fetched, and the canvas reads them from the
 * store. Pages still own the `@/data` fetch; this stays type-only on that barrel.
 */
export function MapDataSync({
  slug,
  cityName,
  boundaries,
  bbox,
  center,
  neighbourhoodCount,
  priceScale,
  priceCap,
  currency,
  snapshotLabel,
}: MapCityPayload) {
  const { setCity } = useMapActions();

  useEffect(() => {
    setCity({
      slug,
      cityName,
      boundaries,
      bbox,
      center,
      neighbourhoodCount,
      priceScale,
      priceCap,
      currency,
      snapshotLabel,
    });
    // Re-sync only when the city changes; the rest of the payload is derived
    // from the slug, so keying on it avoids resetting the store every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, setCity]);

  return null;
}
