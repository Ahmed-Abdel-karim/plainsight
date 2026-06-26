import { getStatsSnapshot, unavailableAggregates } from "@/data";

import { AnalysisCards } from "./analysis-cards";
import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { AsyncBoundary } from "@/components/utils/async-boundary";

/**
 * Server loader for the Analyse cards. Reads the city's unfiltered stats snapshot
 * (city + every neighbourhood) from the pre-baked cube and hands it to the client
 * `AnalysisCards`, which can render the default city-wide selection in the
 * static shell and follow the city actor for live room/price-filtered projections.
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
