"use client";

import { useMemo } from "react";

import { useCityBoundaries } from "./use-city-boundaries";

export function useNeighbourhoodNames(
  slug: string | null,
  snapshotId: string | null,
): Record<string, string> {
  const boundaries = useCityBoundaries(slug, snapshotId);

  return useMemo(() => {
    const names: Record<string, string> = {};
    for (const feature of boundaries?.features ?? []) {
      names[feature.properties.id] = feature.properties.name;
    }
    return names;
  }, [boundaries]);
}
