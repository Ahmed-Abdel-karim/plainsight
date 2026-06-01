"use client";

import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";
import type { ScopeAggregates } from "@/data/contract";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "./format";
import { ChartCard } from "./chart-card";

const chartConfig = {
  count: { label: "Listings", color: "var(--data-bar)" },
} satisfies ChartConfig;

/**
 * Price-distribution histogram with a median marker, rendered on the shadcn
 * `Chart` (Recharts) component. Static — server-provided `priceHistogram` only,
 * no tooltip/cursor, no filtering.
 */
export function PriceHistogram({
  aggregates,
  currency,
}: {
  aggregates: ScopeAggregates;
  currency: string;
}) {
  const bins = aggregates.priceHistogram;
  const totalCount = bins.reduce((sum, b) => sum + b.count, 0);

  if (bins.length === 0 || totalCount === 0) {
    return (
      <ChartCard
        title="Price distribution"
        subtitle={`Listings per nightly band`}
      >
        <p className="type-caption text-muted-foreground">
          Too few listings to characterise.
        </p>
      </ChartCard>
    );
  }

  const data = bins.map((b, i) => ({ idx: String(i), count: b.count }));
  const priceMin = bins[0].x0;
  const priceMax = bins[bins.length - 1].x1;

  const median = aggregates.medianPrice;
  const medianIdx =
    median != null
      ? bins.findIndex((b) => median >= b.x0 && median < b.x1)
      : -1;

  const subtitle =
    median != null
      ? `Listings per nightly band · median ${formatCurrency(median, currency)}`
      : "Listings per nightly band";

  return (
    <ChartCard title="Price distribution" subtitle={subtitle}>
      <ChartContainer config={chartConfig} className="aspect-auto h-32 w-full">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="idx" hide />
          <YAxis hide />
          {medianIdx >= 0 ? (
            <ReferenceLine
              x={String(medianIdx)}
              stroke="var(--foreground)"
              strokeDasharray="3 2"
              strokeWidth={1}
            />
          ) : null}
          <Bar dataKey="count" fill="var(--color-count)" radius={2} />
        </BarChart>
      </ChartContainer>
      <div className="flex justify-between type-caption-mono text-muted-foreground tabular-nums">
        <span>{formatCurrency(priceMin, currency)}</span>
        <span>{formatCurrency(priceMax, currency)}</span>
      </div>
    </ChartCard>
  );
}
