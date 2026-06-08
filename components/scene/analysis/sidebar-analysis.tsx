import { getSidebarScopeAggregates, type Scope } from "@/data";

import { AnalysisCards } from "./analysis-cards";
import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { AsyncBoundary } from "../../utils/async-boundary";

/**
 * Server loader for the Analyse cards. The only thing it fetches is the
 * *scope-dependent* piece — the active scope's pre-baked aggregates (the data
 * layer returns zeroed aggregates when missing, so there's nothing to massage).
 * Static per-city scalars (`currency`, `bounds`, `scope`) are read by the client
 * `AnalysisCards` via `useSceneMeta()`. Hands the scope aggregates to the client
 * `AnalysisCards`, which owns the filter ↔ URL state + the off-thread recompute.
 */
export function SidebarAnalysis({
  citySlug,
  scope,
}: {
  citySlug: string;
  scope: Scope;
}) {
  const scopeId = scope.type === "neighbourhood" ? scope.id : undefined;
  return (
    <AsyncBoundary
      data={() => getSidebarScopeAggregates(citySlug, scope.type, scopeId)}
      Component={({ data }) => <AnalysisCards defaultAggregates={data} />}
      fallback={<AnalysisCardsSkeleton />}
    />
  );
}
