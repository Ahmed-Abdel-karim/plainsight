"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import type { ScopeAggregates } from "@/data/contract";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "../shared/format";
import { ChartCard } from "./chart-card";

const chartConfig = {
  count: { label: "Listings", color: "var(--data-bar)" },
} satisfies ChartConfig;

/**
 * Price-distribution histogram with a median marker, rendered on the shadcn
 * `Chart` (Recharts) component. Hovering a band highlights its bar and fills the
 * persistent hover strip below with the band range · listing count · share —
 * matching the prototype's `chart-hover-strip`.
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

  const hovered = active != null ? bins[active] : null;

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
            content={<HoverReporter onActive={reportActive} />}
          />
          {medianIdx >= 0 ? (
            <ReferenceLine
              x={String(medianIdx)}
              stroke="var(--foreground)"
              strokeDasharray="3 2"
              strokeWidth={1}
            />
          ) : null}
          <Bar dataKey="count" radius={2} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={
                  i === active
                    ? "var(--color-brand-emphasis)"
                    : "var(--color-count)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="flex justify-between type-caption-mono text-muted-foreground tabular-nums">
        <span>{formatCurrency(priceMin, currency)}</span>
        <span>{formatCurrency(priceMax, currency)}</span>
      </div>

      <div
        className="flex min-h-5 items-center gap-1.5 type-caption-mono tabular-nums"
        aria-live="polite"
      >
        {hovered ? (
          <>
            <span className="text-foreground">
              {formatCurrency(hovered.x0, currency)}–
              {formatCurrency(hovered.x1, currency)}
            </span>
            <span className="text-muted-foreground/60" aria-hidden>
              ·
            </span>
            <span className="text-muted-foreground">
              {hovered.count.toLocaleString("en")} listings
            </span>
            <span className="text-muted-foreground/60" aria-hidden>
              ·
            </span>
            <span className="text-foreground">
              {Math.round((hovered.count / totalCount) * 100)}%
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Hover a bar for details</span>
        )}
      </div>
    </ChartCard>
  );
}

/**
 * Tooltip-content bridge: Recharts passes the active band index in here; we lift
 * it to the chart's state to drive the persistent hover strip (and keyboard
 * navigation via `accessibilityLayer`) instead of rendering a floating tooltip.
 */
function HoverReporter({
  active,
  activeIndex,
  onActive,
}: {
  active?: boolean;
  activeIndex?: string | number;
  onActive: (index: number | null) => void;
}) {
  useEffect(() => {
    onActive(
      active && activeIndex != null && activeIndex !== ""
        ? Number(activeIndex)
        : null,
    );
  }, [active, activeIndex, onActive]);
  return null;
}
