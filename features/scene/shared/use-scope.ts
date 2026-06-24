"use client";

/**
 * Neighbourhood scope, read from the city machine. In Browse, clicking a
 * boundary narrows the list, count, and dots to that neighbourhood; clearing
 * returns to the city-wide scope. The root machine mirrors it to the URL, so
 * consumers do not need `useSearchParams`.
 *
 *   ?nbhd=camden   → neighbourhood scope (absent = city-wide)
 */
import { useCallback } from "react";

import { useNbhd, useSetNbhd } from "../state";

export interface UseScopeResult {
  neighbourhoodId: string | null;
  setNeighbourhood: (id: string | null) => void;
  toggleNeighbourhood: (id: string) => void;
}

export function useScope(): UseScopeResult {
  const nbhd = useNbhd();
  const setNbhd = useSetNbhd();

  const setNeighbourhood = setNbhd;

  const toggleNeighbourhood = useCallback(
    (id: string) => setNbhd(nbhd === id ? null : id),
    [setNbhd, nbhd],
  );

  return {
    neighbourhoodId: nbhd,
    setNeighbourhood,
    toggleNeighbourhood,
  };
}
