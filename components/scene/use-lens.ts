"use client";

/**
 * Lens + selected-listing state, read from the ui machine.
 *
 *   ?lens=browse        → the Browse lens (absent = the default `analyse` lens)
 *   ?listing=12345      → the open listing's detail drawer (absent = none)
 *
 * The root machine mirrors these to the URL as a `replaceState` side effect. No
 * consumer reads `useSearchParams`, so the route stays static under
 * `cacheComponents`.
 */
import { useMemo } from "react";

import type { Lens } from "@/lib/search-params";

import {
  useLens as useLensValue,
  useSelectedId,
  useSetLens,
  useSelectListing,
} from "./state";

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
  const setLens = useSetLens();
  const selectListing = useSelectListing();

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
