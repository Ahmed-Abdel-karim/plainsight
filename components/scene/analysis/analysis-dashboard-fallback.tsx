"use client";

import type { ScopeAggregates } from "@/data/contract";

import { AnalysisCards } from "./analysis-cards";
import { FilterPanel } from "./filter-panel";
import { SidebarFoot } from "./sidebar-foot";
import type { FilterBounds } from "./use-filters";

const noop = () => {};

/**
 * Prerenderable default view shown while `AnalysisDashboard` (which reads the URL
 * via nuqs, request-time data) suspends. It renders the exact default layout —
 * a non-interactive filter panel at full range + the pre-baked cards — so the
 * hydration swap is seamless (no flash, no layout shift). Lives behind a client
 * boundary because `FilterPanel`'s handlers aren't serializable from the server.
 */
export function AnalysisDashboardFallback({
  currency,
  defaultAggregates,
  bounds,
}: {
  currency: string;
  defaultAggregates: ScopeAggregates;
  bounds: FilterBounds;
}) {
  return (
    <div className="flex flex-col gap-stack">
      <FilterPanel
        filters={{ roomTypes: [], priceRange: [bounds.min, bounds.max] }}
        bounds={bounds}
        currency={currency}
        isDefault
        pending={false}
        onRoomTypesChange={noop}
        onPriceChange={noop}
        onReset={noop}
      />
      <AnalysisCards aggregates={defaultAggregates} currency={currency} />
      <SidebarFoot />
    </div>
  );
}
