"use client";

import dynamic from "next/dynamic";

import type { StatsSnapshot } from "@/data/contract";

import {
  AnalysisCardsSkeleton,
  PriceHistogramSkeleton,
  TopHostsBarSkeleton,
} from "./analysis-cards-skeleton";
import { KpiRow } from "./kpi-row";
import { RoomMixBar } from "./room-mix-bar";
import { useCityFraming } from "../state";
import { useStats } from "./use-stats";

// The two Recharts-backed charts are the route's only importers of recharts (and
// its redux-toolkit/immer/decimal.js cluster). Loading them lazily keeps that
// ~80 KB out of the scene's first-load JS; the skeletons hold layout, so the
// swap-in is shift-free.
const PriceHistogram = dynamic(
  () => import("./price-histogram").then((m) => m.PriceHistogram),
  { ssr: false, loading: PriceHistogramSkeleton },
);
const TopHostsBar = dynamic(
  () => import("./top-hosts-bar").then((m) => m.TopHostsBar),
  { ssr: false, loading: TopHostsBarSkeleton },
);

/**
 * The four distribution cards. Pure consumer: `useStats` resolves the projection
 * for the active selection, so this never decides default-vs-live. `null` means
 * the live result is still pending.
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
