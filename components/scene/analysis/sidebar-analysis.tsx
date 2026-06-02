import { Suspense } from "react";
import {
  getSidebarFilterBounds,
  getSidebarScopeAggregates,
  unavailableAggregates,
  type Scope,
} from "@/data";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisDashboard } from "./analysis-dashboard";
import { AnalysisDashboardFallback } from "./analysis-dashboard-fallback";

/**
 * The analysis surface below the market-snapshot header: filter panel, headline
 * KPIs, and the three distribution charts. Fetches the active scope's pre-baked
 * (unfiltered) aggregates and the stable price bounds **once** on the server,
 * then hands them to the client `AnalysisDashboard`, which owns the filter ↔ URL
 * state and the off-thread recompute. No `searchParams` is read here, so this
 * stays a cached Server Component.
 */
export async function SidebarAnalysis({
  citySlug,
  scope,
  currency,
}: {
  citySlug: string;
  scope: Scope;
  currency: string;
}) {
  const scopeId = scope.type === "neighbourhood" ? scope.id : undefined;
  const defaultAggregates =
    (await getSidebarScopeAggregates(citySlug, scope.type, scopeId)) ??
    unavailableAggregates;

  const bounds =
    (await getSidebarFilterBounds(citySlug)) ??
    boundsFromAggregates(defaultAggregates);

  return (
    <Suspense
      fallback={
        <AnalysisDashboardFallback
          currency={currency}
          defaultAggregates={defaultAggregates}
          bounds={bounds}
        />
      }
    >
      <AnalysisDashboard
        citySlug={citySlug}
        scope={scope}
        currency={currency}
        defaultAggregates={defaultAggregates}
        bounds={bounds}
      />
    </Suspense>
  );
}

/** Fallback bounds from the histogram edges if city meta is unavailable. */
function boundsFromAggregates(aggregates: {
  priceHistogram: Array<{ x0: number; x1: number }>;
}): { min: number; max: number } {
  const bins = aggregates.priceHistogram;
  if (bins.length === 0) return { min: 0, max: 100 };
  return { min: bins[0].x0, max: bins[bins.length - 1].x1 };
}

/**
 * Content-less placeholder for the analysis surface while its scope aggregates +
 * filter bounds are fetched on the server. Distinct from `AnalysisDashboardFallback`,
 * which renders the *real* pre-baked default cards during client hydration — that
 * data isn't available yet at this boundary, so this only mirrors the layout
 * (filter panel · KPI row · three charts · footer) to hold space without shift.
 */
export function SidebarAnalysisFallback() {
  return (
    <div className="flex flex-col gap-stack" aria-hidden="true">
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
