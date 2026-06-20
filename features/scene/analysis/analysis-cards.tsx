"use client";

import type { ScopeAggregates } from "@/data/contract";

import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";
import { useAggregates, useCityFraming, useIsDefaultFilter } from "../state";

/**
 * The four distribution cards. This component only selects and renders; the
 * city actor owns aggregate recomputation. At the default full-range/all-rooms
 * view, it renders the server's pre-baked `defaultAggregates`; once filters are
 * non-default, the actor publishes live filtered aggregates. Until a filtered
 * result lands, the last good aggregate stays on screen.
 */

export function AnalysisCards({
  currency: defaultCurrency,
  defaultAggregates,
}: {
  currency: string;
  defaultAggregates: ScopeAggregates;
}) {
  const city = useCityFraming();
  const currency = city?.currency ?? defaultCurrency;
  const isDefault = useIsDefaultFilter();
  const filtered = useAggregates();

  const showSkeleton = !isDefault && filtered === null;
  const aggregates =
    isDefault || filtered === null ? defaultAggregates : filtered;

  if (showSkeleton) return <AnalysisCardsSkeleton />;

  return (
    <>
      <KpiRow aggregates={aggregates} currency={currency} />
      <PriceHistogram aggregates={aggregates} currency={currency} />
      <RoomMixBar aggregates={aggregates} />
      <TopHostsBar aggregates={aggregates} />
    </>
  );
}
