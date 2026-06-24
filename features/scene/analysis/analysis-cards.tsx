"use client";

import type { StatsSnapshot } from "@/data/contract";

import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";
import { useCityFraming } from "../state";
import { useStats } from "./use-stats";

/**
 * The four distribution cards. Pure consumer: `useStats` resolves the stats for
 * the active filter — the server-seeded snapshot for an unfiltered view (city or
 * neighbourhood), the city actor's live recompute for a real filter — so this
 * never decides default-vs-live. `null` means the live result is still pending.
 */

export function AnalysisCards({
  currency: defaultCurrency,
  snapshot,
}: {
  currency: string;
  snapshot: StatsSnapshot;
}) {
  const city = useCityFraming();
  const currency = city?.currency ?? defaultCurrency;
  const aggregates = useStats(snapshot);

  if (aggregates === null) return <AnalysisCardsSkeleton />;

  return (
    <>
      <KpiRow aggregates={aggregates} currency={currency} />
      <PriceHistogram aggregates={aggregates} currency={currency} />
      <RoomMixBar aggregates={aggregates} />
      <TopHostsBar aggregates={aggregates} />
    </>
  );
}
