"use client";

import { useEffect, useState } from "react";

import type { ScopeAggregates } from "@/data/contract";
import type { Scope } from "@/data/types";
import { useCityListings } from "@/components/scene/use-city-listings";

import { AnalysisCards } from "./analysis-cards";
import { FilterPanel } from "./filter-panel";
import { SidebarFoot } from "./sidebar-foot";
import { useFilters, type FilterBounds } from "./use-filters";

/**
 * Client surface that wires the filter controls to the analysis cards. At the
 * default (full-range, all-rooms) view it shows the server's pre-baked
 * `defaultAggregates` at zero cost; on the first non-default filter it spins up
 * the shared listings worker and recomputes off-thread, feeding the same leaf
 * components the live filtered aggregate. Filter state lives in the URL (nuqs).
 */
export function AnalysisDashboard({
  citySlug,
  scope,
  currency,
  defaultAggregates,
  bounds,
}: {
  citySlug: string;
  scope: Scope;
  currency: string;
  defaultAggregates: ScopeAggregates;
  bounds: FilterBounds;
}) {
  const { filters, isDefault, setRoomTypes, setPriceRange, reset } =
    useFilters(bounds);

  // Lazy: the worker (and its multi-MB fetch) only exists while filtering.
  const listings = useCityListings(citySlug, { enabled: !isDefault });

  // The filtered result is tagged with the scope+filters it was computed for, so
  // `pending` (and the stale-result guard) derive from render with no extra state.
  const [filtered, setFiltered] = useState<{
    key: string;
    result: ScopeAggregates;
  } | null>(null);
  const key = filterKey(scope, filters);

  useEffect(() => {
    if (isDefault || !listings) return;
    let cancelled = false;
    listings.ready
      .then(() => listings.aggregates(scope, filters))
      .then((result) => {
        if (!cancelled) setFiltered({ key, result });
      })
      .catch(() => {
        /* leave the last good aggregate in place on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [listings, scope, filters, isDefault, key]);

  const pending = !isDefault && filtered?.key !== key;
  // Default view → pre-baked; otherwise the latest filtered result, falling back
  // to the default until the first recompute resolves.
  const aggregates =
    isDefault || filtered === null ? defaultAggregates : filtered.result;

  return (
    <div className="flex flex-col gap-stack">
      <FilterPanel
        filters={filters}
        bounds={bounds}
        currency={currency}
        isDefault={isDefault}
        pending={pending}
        onRoomTypesChange={setRoomTypes}
        onPriceChange={setPriceRange}
        onReset={reset}
      />
      <AnalysisCards aggregates={aggregates} currency={currency} />
      <SidebarFoot />
    </div>
  );
}

/** Stable identity for a scope + filter combination (for staleness + pending). */
function filterKey(
  scope: Scope,
  filters: { roomTypes: string[]; priceRange: [number, number] },
): string {
  const scopePart = scope.type === "neighbourhood" ? `n:${scope.id}` : "city";
  return `${scopePart}|${[...filters.roomTypes].sort().join(",")}|${filters.priceRange.join("-")}`;
}
