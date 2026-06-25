"use client";

import type { ScopeAggregates, StatsSnapshot } from "@/data/contract";

import { useAggregates, useIsDefaultFilter, useNbhd } from "../state";

/**
 * The single read for the Analyse cards — the stats for the active filter, with
 * the caller never branching on default-vs-live. The unfiltered `snapshot` is a
 * server prop (so the default view renders in the static shell); the city machine
 * supplies the live recompute for a real filter.
 *
 * Returns `null` while a non-default filter's live result is still pending — the
 * cue for the skeleton.
 */
export function useStats(snapshot: StatsSnapshot): ScopeAggregates | null {
  const live = useAggregates();
  const nbhd = useNbhd();
  const roomPriceDefault = useIsDefaultFilter();

  // Default room/price → the server snapshot slice (instant, city or neighbourhood).
  // A real room/price filter → the machine's live recompute (null until it lands).
  if (roomPriceDefault) {
    return (
      (nbhd ? snapshot.neighbourhoods[nbhd] : snapshot.city) ?? snapshot.city
    );
  }
  return live;
}
