import { getScopeAggregates, type Scope } from "@/data";

import { AnalysisCards } from "./analysis-cards";
import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { AsyncBoundary } from "@/components/utils/async-boundary";

/**
 * Server loader for the Analyse cards. The only thing it fetches is the
 * *scope-dependent* piece — the active scope's pre-baked aggregates (the data
 * layer returns zeroed aggregates when missing, so there's nothing to massage).
 * Static per-city scalars are threaded in from server-read city meta. Hands the
 * scope aggregates to the client `AnalysisCards`, which owns the filter ↔ URL
 * state + the off-thread recompute.
 */
export function AnalysisPanel({
  citySlug,
  currency,
  scope,
}: {
  citySlug: string;
  currency: string;
  scope: Scope;
}) {
  const scopeId = scope.type === "neighbourhood" ? scope.id : undefined;
  return (
    <AsyncBoundary
      data={() => getScopeAggregates(citySlug, scope.type, scopeId)}
      Component={({ data }) => (
        <AnalysisCards currency={currency} defaultAggregates={data} />
      )}
      fallback={<AnalysisCardsSkeleton />}
    />
  );
}
