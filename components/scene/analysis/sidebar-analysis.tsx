import { getSidebarScopeAggregates, type Scope } from "@/data";

import { AnalysisCards } from "./analysis-cards";
import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { AsyncBoundary } from "../../utils/async-boundary";

/**
 * Server loader for the Analyse cards. The only thing it fetches is the
 * *scope-dependent* piece — the active scope's pre-baked aggregates (the data
 * layer returns zeroed aggregates when missing, so there's nothing to massage).
 * The stable, meta-derived scalars (`currency`, `bounds`) are threaded in from
 * the page, so they don't need re-fetching here. Hands everything to the client
 * `AnalysisCards`, which owns the filter ↔ URL state + the off-thread recompute.
 */
export function SidebarAnalysis({
  citySlug,
  scope,
  currency,
  bounds,
}: {
  citySlug: string;
  scope: Scope;
  currency: string;
  bounds: { min: number; max: number };
}) {
  const scopeId = scope.type === "neighbourhood" ? scope.id : undefined;
  return (
    <AsyncBoundary
      data={() => getSidebarScopeAggregates(citySlug, scope.type, scopeId)}
      Component={({ data }) => (
        <AnalysisCards
          citySlug={citySlug}
          scope={scope}
          currency={currency}
          defaultAggregates={data}
          bounds={bounds}
        />
      )}
      fallback={<AnalysisCardsSkeleton />}
    />
  );
}
