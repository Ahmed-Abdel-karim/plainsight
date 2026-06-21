"use client";

import type { ScopeAggregates } from "@/data/contract";

import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";
import { useAggregates, useCityFraming, useIsDefaultView } from "../state";

/**
 * The four distribution cards. This component only selects and renders; the
 * city actor owns aggregate recomputation. At the city-wide, full-range/all-rooms
 * view, it renders the server's pre-baked `defaultAggregates`; once a
 * neighbourhood is selected or filters go non-default, the actor publishes live
 * scoped aggregates. Until that scoped result lands, a skeleton stands in.
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
  // The server default is the city-wide, unfiltered projection, so it only
  // stands in for the default view; any neighbourhood or filter makes the view
  // non-default and we follow the actor's live aggregates.
  const isDefaultView = useIsDefaultView();
  const filtered = useAggregates();

  const showSkeleton = !isDefaultView && filtered === null;
  const aggregates =
    isDefaultView || filtered === null ? defaultAggregates : filtered;

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
