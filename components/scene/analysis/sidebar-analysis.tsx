import type { ScopeAggregates } from "@/data";
import { FilterPanel } from "./filter-panel";
import { KpiRow } from "./kpi-row";
import { PriceHistogram } from "./price-histogram";
import { RoomMixBar } from "./room-mix-bar";
import { TopHostsBar } from "./top-hosts-bar";
import { SidebarFoot } from "./sidebar-foot";

/**
 * The analysis surface below the market-snapshot header: filter shell, headline
 * KPIs, and the three distribution charts, all driven by the scope's default
 * (unfiltered) `ScopeAggregates`. Display-only — no filtering, no interaction.
 * One component serves both the desktop aside and the mobile drawer (Rule 5).
 */
export function SidebarAnalysis({
  aggregates,
  currency,
}: {
  aggregates: ScopeAggregates;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-stack">
      <FilterPanel aggregates={aggregates} currency={currency} />
      <KpiRow aggregates={aggregates} currency={currency} />
      <PriceHistogram aggregates={aggregates} currency={currency} />
      <RoomMixBar aggregates={aggregates} />
      <TopHostsBar aggregates={aggregates} />
      <SidebarFoot />
    </div>
  );
}
