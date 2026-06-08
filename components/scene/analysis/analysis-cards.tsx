"use client";

import type { ScopeAggregates } from "@/data/contract";
import { useFilteredAggregates } from "@/components/scene/stores";

import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";
import { useFilters } from "./use-filters";
import { useMapCity } from "../stores";

/**
 * The four distribution cards. This component only *selects and renders* — the
 * trigger that recomputes aggregates now lives in the scene store's
 * `crossSliceSubscriptions` (symmetric with the hex recompute), so there is no
 * effect, `useState`, or cancel/keying bookkeeping here. At the default
 * (full-range, all-rooms) view it renders the server's pre-baked
 * `defaultAggregates` at zero cost; once a filter goes non-default the store's
 * worker fills `useFilteredAggregates()` and the same leaf cards show the live
 * filtered numbers (stale-while-revalidate — the last good aggregate stays put
 * until the next one lands).
 */
export function AnalysisCards({
  defaultAggregates,
}: {
  defaultAggregates: ScopeAggregates;
}) {
  const city = useMapCity();
  const currency = city?.currency ?? "";
  const { isDefault } = useFilters();
  const filtered = useFilteredAggregates();

  // Cold filtered path (a deep-linked/refreshed URL with active filters): no real
  // result yet, and the server's `defaultAggregates` are the *wrong* numbers for
  // this view — show a skeleton instead of flashing them. Interactive filter
  // changes keep `filtered` non-null, so they fall through to the
  // stale-while-revalidate path (the last good aggregate) below.
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
