"use client";

import { useMemo } from "react";

import type {
  BrowseCollection,
  BrowsePoint,
  BrowsePointProperties,
} from "@/data/contract";
import type { ListingFilters, SortKey } from "@/data/types";
import { projectBrowseListings } from "@/lib/listings";

export interface BrowseListingsProjection {
  listings: BrowsePointProperties[];
  listingsByIndex: Map<number, number>;
  total: number;
}

export function useBrowseListingsProjection(
  collection: BrowseCollection | null,
  neighbourhoodId: string | null,
  filters: ListingFilters,
  sort: SortKey,
): BrowseListingsProjection {
  const rows = useMemo(
    () =>
      collection?.features.map((feature: BrowsePoint) => feature.properties),
    [collection],
  );

  const listings = useMemo(() => {
    if (!rows) return [];
    return projectBrowseListings(
      rows,
      { neighbourhood: neighbourhoodId, filters },
      sort,
    );
  }, [rows, neighbourhoodId, filters, sort]);

  const listingsByIndex = useMemo(
    () => new Map(listings.map((listing, index) => [listing.id, index])),
    [listings],
  );

  const total = useMemo(() => {
    if (!collection) return 0;
    if (neighbourhoodId === null) return collection.features.length;
    return collection.features.filter(
      (feature) => feature.properties.neighbourhoodId === neighbourhoodId,
    ).length;
  }, [collection, neighbourhoodId]);

  return { listings, listingsByIndex, total };
}
