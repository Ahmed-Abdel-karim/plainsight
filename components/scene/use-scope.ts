"use client";

/**
 * Neighbourhood scope, read from the scene store (FR-013). In Browse, clicking a
 * boundary narrows the list, count, and dots to that neighbourhood; clearing
 * returns to the city-wide scope. The store mirrors it to the URL as a
 * `replaceState` side-effect — no `useSearchParams`, so no `cacheComponents`
 * dynamic/Suspense hole. Shared (like the lens + filters) between the sidebar and
 * the map. The public shape is unchanged, so its consumers are untouched.
 *
 *   ?nbhd=camden   → neighbourhood scope (absent = city-wide)
 */
import { useMemo } from "react";

import type { Scope } from "@/data/types";
import { scopeFromNbhd } from "@/lib/search-params";
import { useNbhd, useSceneActions } from "./stores";

export interface UseScopeResult {
  scope: Scope;
  neighbourhoodId: string | null;
  setNeighbourhood: (id: string | null) => void;
  toggleNeighbourhood: (id: string) => void;
}

export function useScope(): UseScopeResult {
  const nbhd = useNbhd();
  const { setNeighbourhood, toggleNeighbourhood } = useSceneActions();

  const scope = useMemo<Scope>(() => scopeFromNbhd(nbhd), [nbhd]);

  return {
    scope,
    neighbourhoodId: nbhd,
    setNeighbourhood,
    toggleNeighbourhood,
  };
}
