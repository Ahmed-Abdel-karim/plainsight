"use client";

import type { ScopeAggregates, StatsSnapshot } from "@/data/contract";

import { useAggregates, useIsDefaultFilter, useNbhd } from "../state";

/**
 * The single read for the Analyse cards. Default room/price filters read from
 * the server snapshot for the active scope; a real room/price filter reads from
 * the city machine's live projection.
 *
 * Returns `null` while a live projection is still pending — the cue for the
 * skeleton.
 */
export function useStats(snapshot: StatsSnapshot): ScopeAggregates | null {
  const live = useAggregates();
  const nbhd = useNbhd();
  const roomPriceDefault = useIsDefaultFilter();

  // Default room/price → the server snapshot slice (instant, city or neighbourhood).
  // Real room/price filters → the machine's live projection (null until it lands).
  if (roomPriceDefault) {
    return (
      (nbhd ? snapshot.neighbourhoods[nbhd] : snapshot.city) ?? snapshot.city
    );
  }
  return live;
}
