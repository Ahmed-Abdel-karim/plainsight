"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { BrowsePointProperties } from "@/data/contract";
import type { SortKey } from "@/data/types";
import { BrowseEmpty } from "./browse-empty";
import { BrowseError } from "./browse-error";
import { BrowseSummary } from "./browse-summary";
import { ListingList } from "../listings";
import { SortControl } from "./sort-control";
import {
  useBrowseCityParams,
  useBrowseEmptyState,
  useBrowseListInteractions,
  useClearUnreachableListing,
} from "./use-browse-panel-hooks";
import { useNeighbourhoodNames } from "../../shared/use-neighbourhood-names";
import { useResolvedFilters } from "../../state";
import { useScope } from "../../shared/use-scope";
import { useBrowseListingsProjection } from "./use-browse-listings-projection";
import { useBrowsePoints, type BrowsePointsStatus } from "../use-browse-points";

/**
 * The Browse list surface — the live count + sort + virtualized list / empty /
 * loading states. Reads the (URL-shared) filter state via `useResolvedFilters`
 * and the neighbourhood scope via `useScope`, then derives the filtered+sorted list from
 * the lazily-fetched points tier (one compute, feeding both the count and the
 * list). The filter controls live in the shared `FilterPanel` above both tabs.
 * Serves both the desktop sidebar and the mobile sheet from one component.
 */
export function BrowsePanel() {
  const { citySlug, snapshotId, currency } = useBrowseCityParams();
  const filters = useResolvedFilters();
  const { neighbourhoodId } = useScope();
  const { status, collection } = useBrowsePoints(citySlug, snapshotId, {
    enabled: true,
  });
  const [sort, setSort] = useState<SortKey>("price_asc");
  const { listings, listingsByIndex, total } = useBrowseListingsProjection(
    collection,
    neighbourhoodId,
    filters,
    sort,
  );
  useClearUnreachableListing(status, listingsByIndex);

  if (status === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-stack">
        <BrowseError />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-stack">
      <BrowseHeader
        status={status}
        shown={listings.length}
        total={total}
        sort={sort}
        setSort={setSort}
      />
      <BrowseBody
        status={status}
        listings={listings}
        listingsByIndex={listingsByIndex}
        citySlug={citySlug}
        snapshotId={snapshotId}
        currency={currency}
      />
    </div>
  );
}

function BrowseHeader({
  status,
  shown,
  total,
  sort,
  setSort,
}: {
  status: BrowsePointsStatus;
  shown: number;
  total: number;
  sort: SortKey;
  setSort: (sort: SortKey) => void;
}) {
  return (
    <div className="flex flex-col gap-snug">
      {status === "loading" ? (
        <p
          role="status"
          aria-busy="true"
          className="type-caption text-muted-foreground"
        >
          Loading listings…
        </p>
      ) : (
        <BrowseSummary shown={shown} total={total} />
      )}
      <SortControl value={sort} onChange={setSort} />
    </div>
  );
}

function BrowseBody({
  status,
  listings,
  listingsByIndex,
  citySlug,
  snapshotId,
  currency,
}: {
  status: BrowsePointsStatus;
  listings: BrowsePointProperties[];
  listingsByIndex: Map<number, number>;
  citySlug: string;
  snapshotId: string;
  currency: string;
}) {
  if (status === "loading") {
    return <BrowseLoadingList />;
  }

  if (listings.length === 0) {
    return <BrowseEmptyBody currency={currency} />;
  }

  return (
    <BrowseListingBody
      listings={listings}
      listingsByIndex={listingsByIndex}
      citySlug={citySlug}
      snapshotId={snapshotId}
      currency={currency}
    />
  );
}

function BrowseEmptyBody({ currency }: { currency: string }) {
  const { emptySummary, resetView } = useBrowseEmptyState(currency);

  return <BrowseEmpty summary={emptySummary} onReset={resetView} />;
}

function BrowseListingBody({
  listings,
  listingsByIndex,
  citySlug,
  snapshotId,
  currency,
}: {
  listings: BrowsePointProperties[];
  listingsByIndex: Map<number, number>;
  citySlug: string;
  snapshotId: string;
  currency: string;
}) {
  const neighbourhoodNames = useNeighbourhoodNames(
    citySlug || null,
    snapshotId || null,
  );
  const listInteractions = useBrowseListInteractions();

  return (
    <ListingList
      listings={listings}
      listingsByIndex={listingsByIndex}
      neighbourhoodNames={neighbourhoodNames}
      currency={currency}
      hoveredId={listInteractions.hoveredId}
      hoverSource={listInteractions.hoverSource}
      selectedId={listInteractions.selectedId}
      onHover={listInteractions.onHover}
      onSelect={listInteractions.onSelect}
    />
  );
}

function BrowseLoadingList() {
  return (
    <div className="flex flex-col gap-snug" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}
