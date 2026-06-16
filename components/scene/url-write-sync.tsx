"use client";

/**
 * Write side of the URL sync — mirrors XState ui state + filter store into the
 * URL via `replaceState` whenever they change. The read side lives in
 * `UrlStoreSync`. Replaces the zustand `registerUrlSync` coordinator so that
 * lens and selectedId are sourced from XState rather than the now-deleted
 * ui-state store.
 */
import { useEffect } from "react";

import { syncSceneUrl } from "@/lib/search-params";

import {
  useLens as useLensValue,
  useSelectedId,
  useNbhd,
  usePriceRange,
  useRoomTypes,
} from "./state";

export function UrlWriteSync() {
  const lens = useLensValue();
  const selectedId = useSelectedId();
  const roomTypes = useRoomTypes();
  const priceRange = usePriceRange();
  const nbhd = useNbhd();

  useEffect(() => {
    syncSceneUrl({ lens, selectedId, roomTypes, priceRange, nbhd });
  }, [lens, selectedId, roomTypes, priceRange, nbhd]);

  return null;
}
