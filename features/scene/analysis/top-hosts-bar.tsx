"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import type { ScopeAggregates } from "@/data/contract";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatPercent } from "../shared/format";
import { ChartCard } from "./chart-card";

const chartConfig = {
  count: { label: "Listings", color: "var(--data-bar)" },
} satisfies ChartConfig;

const MAX_HOSTS = 6;

/**
 * "Who controls this market" — top hosts by listing count as a horizontal
 * shadcn `Chart` (Recharts) bar chart. Static, server data only. Empty below
 * the listing floor → graceful fallback.
 */
export function TopHostsBar({ aggregates }: { aggregates: ScopeAggregates }) {
  const hosts = aggregates.topHosts.slice(0, MAX_HOSTS);
  const share = aggregates.multiListingHostShare;

  const subtitle =
    share != null
      ? `Top hosts by listing count · ${formatPercent(share)} run by multi-listing hosts`
      : "Top hosts by listing count";

  if (hosts.length === 0) {
    return (
      <ChartCard
        title="Who controls this market"
        subtitle="Top hosts by listing count"
      >
        <p className="type-caption text-muted-foreground">
          Too few listings to characterise.
        </p>
      </ChartCard>
    );
  }

  const data = hosts.map((h) => ({
    name: h.hostName ?? `Host ${h.hostId}`,
    count: h.count,
  }));

  return (
    <ChartCard title="Who controls this market" subtitle={subtitle}>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: hosts.length * 26 + 8 }}
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={2}>
            <LabelList
              dataKey="count"
              position="right"
              offset={6}
              className="fill-foreground"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Screen-reader equivalent of the bars — the SVG chart carries no numbers. */}
      <ol className="sr-only">
        {data.map((host) => (
          <li key={host.name}>
            {host.name}: {host.count.toLocaleString("en")} listings
          </li>
        ))}
      </ol>
    </ChartCard>
  );
}
