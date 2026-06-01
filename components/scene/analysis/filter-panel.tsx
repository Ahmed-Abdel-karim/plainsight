"use client";

import {
  ROOM_TYPES,
  type RoomType,
  type ScopeAggregates,
} from "@/data/contract";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "./format";

const ROOM_LABEL: Record<RoomType, string> = {
  "Entire home/apt": "Entire",
  "Private room": "Private",
  "Shared room": "Shared",
  "Hotel room": "Hotel",
};

/**
 * Filter panel — **visual shell only**. The room-type `ToggleGroup` and price
 * `Slider` are the real shadcn controls but rendered `disabled` (not yet wired):
 * no state, no `onValueChange`, no filtering. The filtering architecture drops
 * in here later — when it does, these controls become controlled and feed a
 * filtered aggregate into the same display components, with no restructuring.
 */
export function FilterPanel({
  aggregates,
  currency,
}: {
  aggregates: ScopeAggregates;
  currency: string;
}) {
  const bins = aggregates.priceHistogram;
  const priceMin = bins.length > 0 ? bins[0].x0 : 0;
  const priceMax = bins.length > 0 ? bins[bins.length - 1].x1 : 100;

  return (
    <div className="flex flex-col gap-stack rounded-lg border border-border px-gutter py-gutter">
      <div className="flex items-baseline justify-between">
        <h2 className="text-muted-foreground type-label">Filters</h2>
        <Button variant="ghost" size="xs" disabled>
          Reset
        </Button>
      </div>

      <div className="flex flex-col gap-snug">
        <span className="type-caption text-muted-foreground">Room type</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          defaultValue={[...ROOM_TYPES]}
          disabled
          className="w-full"
          aria-label="Room type"
        >
          {ROOM_TYPES.map((type) => (
            <ToggleGroupItem key={type} value={type} className="flex-1">
              {ROOM_LABEL[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-snug">
        <div className="flex items-baseline justify-between">
          <span className="type-caption text-muted-foreground">Price</span>
          <span className="type-caption-mono text-foreground tabular-nums">
            {formatCurrency(priceMin, currency)} –{" "}
            {formatCurrency(priceMax, currency)}
          </span>
        </div>
        <Slider
          min={priceMin}
          max={priceMax}
          defaultValue={[priceMin, priceMax]}
          disabled
          aria-label="Price range"
        />
      </div>
    </div>
  );
}
