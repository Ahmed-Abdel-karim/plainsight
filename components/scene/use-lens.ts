"use client";

/**
 * Lens + selected-listing state, read from the scene store (E7 / FR-011).
 *
 *   ?lens=browse        → the Browse lens (absent = the default `analyse` lens)
 *   ?listing=12345      → the open listing's detail drawer (absent = none)
 *
 * The store mirrors these to the URL as a `replaceState` side-effect — no
 * `useSearchParams`, so consumers don't force a `cacheComponents` dynamic/Suspense
 * hole (the reason this moved off nuqs; the route now renders statically and
 * `SceneStoreSync` reflects the URL in on the client). Shared by the sidebar
 * (which content to show) and the map (which layer is visible + interactive). The
 * public shape is unchanged, so its consumers are untouched.
 */
import { useMemo } from "react";

import { useLensValue, useSceneActions, useSelectedId } from "./scene-store";
import type { Lens } from "@/lib/search-params";

export type { Lens };

export interface UseLensResult {
  lens: Lens;
  /** The selected listing id, or null when no drawer is open. */
  selectedId: number | null;
  isBrowse: boolean;
  setLens: (lens: Lens) => void;
  selectListing: (id: number | null) => void;
}

export function useLens(): UseLensResult {
  const lens = useLensValue();
  const selectedId = useSelectedId();
  const { setLens, selectListing } = useSceneActions();

  return useMemo(
    () => ({
      lens,
      selectedId,
      isBrowse: lens === "browse",
      setLens,
      selectListing,
    }),
    [lens, selectedId, setLens, selectListing],
  );
}
