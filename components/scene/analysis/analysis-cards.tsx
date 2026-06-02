import type { ScopeAggregates } from "@/data/contract";

import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";

/**
 * The four distribution cards driven by a single `aggregates` value. Shared by
 * the interactive `AnalysisDashboard` (live filtered aggregate) and the Suspense
 * fallback (server's pre-baked default), so both render an identical stack — the
 * hydration swap is seamless.
 */
export function AnalysisCards({
  aggregates,
  currency,
}: {
  aggregates: ScopeAggregates;
  currency: string;
}) {
  return (
    <>
      <KpiRow aggregates={aggregates} currency={currency} />
      <PriceHistogram aggregates={aggregates} currency={currency} />
      <RoomMixBar aggregates={aggregates} />
      <TopHostsBar aggregates={aggregates} />
    </>
  );
}
