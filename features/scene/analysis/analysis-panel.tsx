import { getStatsSnapshot, unavailableAggregates } from "@/data";

import { AnalysisCards } from "./analysis-cards";
import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { AsyncBoundary } from "@/components/utils/async-boundary";

/**
 * Server loader for the Analyse cards. Reads the city's unfiltered stats snapshot
 * (city + every neighbourhood) from the pre-baked cube and hands it to the client
 * `AnalysisCards`, which seeds it into React Query — so the default view renders
 * in the static shell — and follows the city actor for a real filter.
 */
export function AnalysisPanel({
  citySlug,
  currency,
}: {
  citySlug: string;
  currency: string;
}) {
  return (
    <AsyncBoundary
      data={() => getStatsSnapshot(citySlug)}
      Component={({ data }) => (
        <AnalysisCards
          currency={currency}
          snapshot={data ?? { city: unavailableAggregates, neighbourhoods: {} }}
        />
      )}
      fallback={<AnalysisCardsSkeleton />}
    />
  );
}
