"use client";

import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { RoomType } from "@/data/contract";
import type { SortKey } from "@/data/types";
import { formatCurrency } from "../analysis/format";
import {
  useCityFraming,
  useHoveredListingId,
  useHoverSource,
  useResetFilters,
  useResolvedFilters,
  useSetHover,
} from "../state";
import { useCityBoundaries } from "../use-city-boundaries";
import { useLens } from "../use-lens";
import { useScope } from "../use-scope";
import { BrowseEmpty } from "./browse-empty";
import { BrowseSummary } from "./browse-summary";
import { ListingList } from "./listing-list";
import { SortControl } from "./sort-control";
import { useBrowseListings, useBrowsePoints } from "./use-browse-points";

const ROOM_LABEL: Record<RoomType, string> = {
  "Entire home/apt": "Entire",
  "Private room": "Private",
  "Shared room": "Shared",
  "Hotel room": "Hotel",
};

/**
 * The Browse list surface — the live count + sort + virtualized list / empty /
 * loading states. Reads the (URL-shared) filter state via `useResolvedFilters`
 * and the neighbourhood scope via `useScope`, then derives the filtered+sorted list from
 * the lazily-fetched points tier (one compute, feeding both the count and the
 * list). The filter controls live in the shared `FilterPanel` above both tabs.
 * Serves both the desktop sidebar and the mobile sheet from one component (CR-002).
 */
export function SidebarBrowse() {
  const city = useCityFraming();
  const citySlug = city?.slug ?? "";
  const currency = city?.currency ?? "";
  // Filter controls live in the shared `FilterPanel` above; here we only read the
  // (URL-shared) filter state to derive the list, plus `reset` for the empty CTA.
  const filters = useResolvedFilters();
  const reset = useResetFilters();
  // Scope is client state (FR-013) — a neighbourhood click on the map narrows it.
  const { scope } = useScope();
  const { selectedId, selectListing } = useLens();
  const setHover = useSetHover();
  const hoveredId = useHoveredListingId();
  const hoverSource = useHoverSource();

  // Browse is only mounted while the lens is active, so the fetch is enabled.
  const { status, collection } = useBrowsePoints(citySlug, { enabled: true });

  // Sort is view state (not URL — a shared link restores filters + listing, not
  // order). Defaults to price ascending; reset on city switch by the `key={slug}`
  // remount where `SidebarBrowse` is rendered (in `SidebarContent`).
  const [sort, setSort] = useState<SortKey>("price_asc");
  const listings = useBrowseListings(collection, scope, filters, sort);

  // FR-010: if the selected listing leaves the filtered/scoped set, close its
  // drawer and clear the selection (the drawer reads the full tier, so the
  // filtered list is the authority on what is still reachable).
  useEffect(() => {
    if (selectedId === null || status !== "ready") return;
    if (!listings.some((listing) => listing.id === selectedId)) {
      selectListing(null);
    }
  }, [selectedId, status, listings, selectListing]);

  // The scoped total (scope only, before the price/room filter) for "N of total".
  const total = useMemo(() => {
    if (!collection) return 0;
    if (scope.type !== "neighbourhood") return collection.features.length;
    return collection.features.filter(
      (feature) => feature.properties.neighbourhoodId === scope.id,
    ).length;
  }, [collection, scope]);

  // Resolve neighbourhood id → display name from the shared boundaries tier (one
  // cached fetch across the map + Browse); fall back to the raw id before it
  // arrives.
  const boundaries = useCityBoundaries(citySlug || null);
  const neighbourhoodNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const feature of boundaries?.features ?? []) {
      map[feature.properties.id] = feature.properties.name;
    }
    return map;
  }, [boundaries]);

  const emptySummary = useMemo(() => {
    // First paint is city-less (the panel mounts before the CITY.CHANGED effect),
    // so currency can be empty — guard the Intl format (it throws on "").
    if (!currency) return "";
    const rooms =
      filters.roomTypes.length === 0
        ? "All room types"
        : filters.roomTypes.map((type) => ROOM_LABEL[type]).join(", ");
    const [min, max] = filters.priceRange;
    return `${rooms} · ${formatCurrency(min, currency)}–${formatCurrency(max, currency)}`;
  }, [filters, currency]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-stack">
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
          <BrowseSummary shown={listings.length} total={total} />
        )}
        <SortControl value={sort} onChange={setSort} />
      </div>

      {status === "loading" ? (
        <div className="flex flex-col gap-snug" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <BrowseEmpty summary={emptySummary} onReset={reset} />
      ) : (
        <ListingList
          listings={listings}
          neighbourhoodNames={neighbourhoodNames}
          currency={currency}
          hoveredId={hoveredId}
          hoverSource={hoverSource}
          selectedId={selectedId}
          onHover={(id) => setHover(id, "list")}
          onSelect={(id) => selectListing(id)}
        />
      )}
    </div>
  );
}
