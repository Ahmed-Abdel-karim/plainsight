import type { ReactNode } from "react";
import type { ScopeAggregates } from "@/data/contract";
import {
  formatNumber,
  formatPercent,
  formatPriceParts,
} from "../shared/format";

/**
 * Headline KPI tiles for the active scope (default, unfiltered data): median
 * price · multi-host share · reviews/month — the unfiltered variant of the
 * design's `FilteredKpiRow`. Below the listing floor the contributing metrics
 * come back `null`; each tile then shows an em-dash with a "too few listings"
 * meta instead of a NaN. Pure presentational — no filtering, no interaction.
 */
export function KpiRow({
  aggregates,
  currency,
}: {
  aggregates: ScopeAggregates;
  currency: string;
}) {
  const { medianPrice, multiListingHostShare, avgReviewsPerMonth } = aggregates;

  const price =
    medianPrice != null ? formatPriceParts(medianPrice, currency) : null;

  return (
    <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border">
      <Kpi
        label="Median price"
        value={
          price ? (
            <>
              <span className="mr-px align-baseline text-sm font-normal text-muted-foreground">
                {price.symbol}
              </span>
              {price.amount}
            </>
          ) : null
        }
        meta={price ? "per night" : "too few listings"}
      />
      <Kpi
        label="Multi-host share"
        value={
          multiListingHostShare != null
            ? formatPercent(multiListingHostShare)
            : null
        }
        meta={
          multiListingHostShare != null ? "hosts with 2+" : "too few listings"
        }
      />
      <Kpi
        label="Reviews / month"
        value={
          avgReviewsPerMonth != null
            ? formatNumber(avgReviewsPerMonth, 1)
            : null
        }
        meta={
          avgReviewsPerMonth != null ? "avg · demand proxy" : "too few listings"
        }
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  meta,
}: {
  label: string;
  value: ReactNode;
  meta: string;
}) {
  return (
    <div className="flex flex-col gap-snug px-gutter py-stack">
      <div className="whitespace-nowrap text-muted-foreground type-label">
        {label}
      </div>
      <div className="type-metric whitespace-nowrap text-foreground">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
      <div className="type-caption text-muted-foreground">{meta}</div>
    </div>
  );
}
