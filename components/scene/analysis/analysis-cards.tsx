"use client";

import { useEffect } from "react";

import type { ScopeAggregates } from "@/data/contract";
import type { Scope } from "@/data/types";
import {
  useFilteredAggregates,
  useListingsActions,
} from "@/components/scene/listings-store";

import { AnalysisCardsSkeleton } from "./analysis-cards-skeleton";
import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";
import { useFilters, type FilterBounds } from "./use-filters";

/**
 * The four distribution cards. The off-thread recompute now lives in
 * `listings-store`; this only *triggers* the scope's aggregate query (a one-line
 * effect — no `useState`, no `ready`/cancel/keying bookkeeping) and *selects* the
 * result. At the default (full-range, all-rooms) view it renders the server's
 * pre-baked `defaultAggregates` at zero cost; once a filter goes non-default the
 * store's worker fills `useFilteredAggregates()` and the same leaf cards show the
 * live filtered numbers (stale-while-revalidate — the last good aggregate stays
 * put until the next one lands).
 *
 * The trigger lives here (not a shell-level component) because this is already a
 * client island behind the sidebar's Suspense boundary: keeping the store-reading
 * `useFilters` out of the prerendered PPR shell is what keeps hydration stable.
 */
export function AnalysisCards({
  citySlug,
  scope,
  currency,
  defaultAggregates,
  bounds,
}: {
  citySlug: string;
  scope: Scope;
  currency: string;
  defaultAggregates: ScopeAggregates;
  bounds: FilterBounds;
}) {
  const { filters, isDefault } = useFilters(bounds);
  const { syncCity, requestAggregates } = useListingsActions();
  const filtered = useFilteredAggregates();

  // Adopt the city worker (idempotent across both sidebar mounts + the map) so a
  // request never races an unset slug, then recompute when the scope/filters move.
  useEffect(() => {
    syncCity(citySlug);
  }, [syncCity, citySlug]);
  useEffect(() => {
    requestAggregates(scope, filters, isDefault);
  }, [requestAggregates, scope, filters, isDefault]);

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
