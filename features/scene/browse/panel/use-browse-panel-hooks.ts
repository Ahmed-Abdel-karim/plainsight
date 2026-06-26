"use client";

import { useCallback, useEffect, useMemo } from "react";

import { filterSummary } from "../../shared/filter-summary";
import {
  useCityFraming,
  useDisplayFilters,
  useHoveredListingId,
  useHoverSource,
  usePriceBounds,
  useResetView,
  useSetMapHover,
} from "../../state";
import { useLens } from "../../shared/use-lens";
import type { BrowsePointsStatus } from "../use-browse-points";

export function useBrowseCityParams() {
  const city = useCityFraming();

  return {
    citySlug: city?.slug ?? "",
    snapshotId: city?.snapshotId ?? "",
    currency: city?.currency ?? "",
  };
}

export function useBrowseEmptyState(currency: string) {
  const displayFilters = useDisplayFilters();
  const bounds = usePriceBounds();
  const resetView = useResetView();

  const emptySummary = useMemo(() => {
    if (!currency) return "";
    return filterSummary(displayFilters, bounds, currency);
  }, [displayFilters, bounds, currency]);

  return { emptySummary, resetView };
}

export function useClearUnreachableListing(
  status: BrowsePointsStatus,
  listingsByIndex: Map<number, number>,
) {
  const { selectedId, selectListing } = useLens();

  useEffect(() => {
    if (selectedId === null || status !== "ready") return;
    if (!listingsByIndex.has(selectedId)) {
      selectListing(null);
    }
  }, [selectedId, status, listingsByIndex, selectListing]);
}

export function useBrowseListInteractions() {
  const { selectedId, selectListing } = useLens();
  const setHover = useSetMapHover();
  const hoveredId = useHoveredListingId();
  const hoverSource = useHoverSource();

  const onHover = useCallback(
    (id: number | null) => setHover(id, "list"),
    [setHover],
  );

  return {
    hoveredId,
    hoverSource,
    selectedId,
    onHover,
    onSelect: selectListing,
  };
}
