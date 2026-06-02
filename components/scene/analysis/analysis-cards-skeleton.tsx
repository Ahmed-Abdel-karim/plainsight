import { Skeleton } from "@/components/ui/skeleton";

import { ChartCard } from "./chart-card";

/**
 * Loading placeholder for the four analysis cards, shown only on the cold
 * filtered path: a deep-linked/refreshed URL carries non-default filters, so the
 * server's pre-baked `defaultAggregates` are the *wrong* numbers for this view.
 * Rather than flash those, we render this until the client worker resolves the
 * real filtered aggregate. Mirrors `AnalysisCards`' layout (same wrappers + the
 * static titles, which aren't data) so the swap-in is shift-free. Interactive
 * filter changes don't hit this — they keep the last good result while pending.
 */
export function AnalysisCardsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border">
        {["Median price", "Multi-host share", "Reviews / month"].map(
          (label) => (
            <div
              key={label}
              className="flex flex-col gap-snug px-gutter py-stack"
            >
              <div className="whitespace-nowrap text-muted-foreground type-label">
                {label}
              </div>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ),
        )}
      </div>

      <ChartCard
        title="Price distribution"
        subtitle="Listings per nightly band"
      >
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-3 w-full" />
      </ChartCard>

      <ChartCard title="Room-type mix" subtitle="Share of listings by type">
        <Skeleton className="h-7 w-full rounded-sm" />
        <ul className="grid grid-cols-2 gap-x-gutter gap-y-snug">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-3 w-full" />
            </li>
          ))}
        </ul>
      </ChartCard>

      <ChartCard
        title="Who controls this market"
        subtitle="Top hosts by listing count"
      >
        {/* Matches the real chart's height for the common 6-host case
            (hosts.length * 26 + 8) to minimise shift on resolve. */}
        <Skeleton className="w-full" style={{ height: 6 * 26 + 8 }} />
      </ChartCard>
    </>
  );
}
