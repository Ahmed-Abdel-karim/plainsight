"use client";

import { cn } from "@/lib/utils";

export type InspectStat = {
  label: string;
  value: string;
  /** Render the value at medium weight — used for the primary metric. */
  emphasis?: boolean;
};

/**
 * Map-chrome readout shared by the hex inspect popup and the price-histogram
 * tooltip: a definition list of right-aligned `label · value` rows. Decorative
 * (`aria-hidden`) — the underlying data is announced by the map/chart itself.
 */
export function InspectStats({ stats }: { stats: InspectStat[] }) {
  return (
    <div
      aria-hidden="true"
      className="map-chrome text-map-label pointer-events-none px-3 py-2 shadow-sm"
    >
      <dl className="flex flex-col gap-0.5">
        {stats.map(({ label, value, emphasis }) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="type-label">{label}</dt>
            <dd
              className={cn("text-sm tabular-nums", emphasis && "font-medium")}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
