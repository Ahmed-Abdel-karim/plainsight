"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Rectangle,
  ReferenceLine,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import type { ScopeAggregates } from "@/data/contract";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatPercent } from "../shared/format";
import { InspectStats } from "../shared/inspect-stats";
import { ChartCard } from "./chart-card";

const chartConfig = {
  count: { label: "Listings", color: "var(--data-bar)" },
} satisfies ChartConfig;

type PriceBin = ScopeAggregates["priceHistogram"][number];

/**
 * Price-distribution histogram with a median marker, rendered on the shadcn
 * `Chart` (Recharts) component. Hovering a band highlights its bar and surfaces
 * a floating tooltip — styled to match the map's hex inspect popup — with the
 * band's price range, listing count, and share.
 */
export function PriceHistogram({
  aggregates,
  currency,
}: {
  aggregates: ScopeAggregates;
  currency: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const reportActive = useCallback(
    (index: number | null) => setActive(index),
    [],
  );

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
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          onMouseLeave={() => setActive(null)}
        >
          <XAxis dataKey="idx" hide />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={
              <BandTooltip
                bins={bins}
                totalCount={totalCount}
                currency={currency}
                onActive={reportActive}
              />
            }
          />
          {medianIdx >= 0 ? (
            <ReferenceLine
              x={String(medianIdx)}
              stroke="var(--foreground)"
              strokeDasharray="3 2"
              strokeWidth={1}
            />
          ) : null}
          <Bar
            dataKey="count"
            radius={2}
            isAnimationActive={false}
            shape={(props: BarShapeProps) => (
              <Rectangle
                {...props}
                fill={
                  props.index === active
                    ? "var(--color-brand-emphasis)"
                    : "var(--color-count)"
                }
              />
            )}
          />
        </BarChart>
      </ChartContainer>

      <div className="flex justify-between type-caption-mono text-muted-foreground tabular-nums">
        <span>{formatCurrency(priceMin, currency)}</span>
        <span>{formatCurrency(priceMax, currency)}</span>
      </div>
    </ChartCard>
  );
}

/**
 * Tooltip content for a hovered band. Lifts the active index to the chart's
 * state (driving the bar highlight) and renders the shared inspect readout with
 * the band's price range, listing count, and share of the total.
 */
function BandTooltip({
  active,
  activeIndex,
  bins,
  totalCount,
  currency,
  onActive,
}: {
  active?: boolean;
  activeIndex?: string | number;
  bins: PriceBin[];
  totalCount: number;
  currency: string;
  onActive: (index: number | null) => void;
}) {
  const index =
    active && activeIndex != null && activeIndex !== ""
      ? Number(activeIndex)
      : null;

  useEffect(() => {
    onActive(index);
  }, [index, onActive]);

  if (index == null) return null;
  const band = bins[index];
  if (!band) return null;

  return (
    <InspectStats
      stats={[
        {
          label: "Price",
          value: `${formatCurrency(band.x0, currency)}–${formatCurrency(band.x1, currency)}`,
          emphasis: true,
        },
        { label: "Listings", value: band.count.toLocaleString("en") },
        { label: "Share", value: formatPercent(band.count / totalCount) },
      ]}
    />
  );
}
