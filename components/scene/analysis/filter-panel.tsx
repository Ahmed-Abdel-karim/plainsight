"use client";

import { useState } from "react";
import { ROOM_TYPES, type RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebouncedCallback } from "use-debounce";
import { formatCurrency } from "./format";
import type { FilterBounds } from "./use-filters";

const ROOM_LABEL: Record<RoomType, string> = {
  "Entire home/apt": "Entire",
  "Private room": "Private",
  "Shared room": "Shared",
  "Hotel room": "Hotel",
};

const PRICE_COMMIT_MS = 250;

/**
 * Controlled filter panel. Room-type toggles commit immediately (discrete); the
 * price slider drags on instant local state and commits the range after the drag
 * settles (debounced), so the URL write + worker recompute fire once. An empty
 * room selection means "all" — the panel never collapses to zero filters.
 */
export function FilterPanel({
  filters,
  bounds,
  currency,
  isDefault,
  pending,
  onRoomTypesChange,
  onPriceChange,
  onReset,
}: {
  filters: ListingFilters;
  bounds: FilterBounds;
  currency: string;
  isDefault: boolean;
  pending: boolean;
  onRoomTypesChange: (roomTypes: RoomType[]) => void;
  onPriceChange: (range: [number, number]) => void;
  onReset: () => void;
}) {
  // Empty selection is the "all room types" state — show every toggle as active.
  const selectedRooms =
    filters.roomTypes.length === 0 ? [...ROOM_TYPES] : filters.roomTypes;

  // Local draft for smooth dragging; the committed range lands in the URL.
  const [priceDraft, setPriceDraft] = useState<[number, number]>(
    filters.priceRange,
  );
  // Re-sync the draft when the committed range changes externally (reset, the
  // back button) — React's "adjust state during render" pattern, guarded by the
  // last range we synced from, so it runs only on an actual change.
  const [syncedRange, setSyncedRange] = useState(filters.priceRange);
  if (
    filters.priceRange[0] !== syncedRange[0] ||
    filters.priceRange[1] !== syncedRange[1]
  ) {
    setSyncedRange(filters.priceRange);
    setPriceDraft(filters.priceRange);
  }

  const commitPrice = useDebouncedCallback(onPriceChange, PRICE_COMMIT_MS);

  return (
    <div className="flex flex-col gap-stack rounded-lg border border-border px-gutter py-gutter">
      <div className="flex items-baseline justify-between">
        <h2 className="text-muted-foreground type-label">
          Filters
          {pending ? (
            <span className="ml-2 type-caption text-muted-foreground">
              Updating…
            </span>
          ) : null}
        </h2>
        <Button
          variant="ghost"
          size="xs"
          disabled={isDefault}
          onClick={onReset}
        >
          Reset
        </Button>
      </div>

      <div className="flex flex-col gap-snug">
        <span className="type-caption text-muted-foreground">Room type</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={selectedRooms}
          onValueChange={(value) => onRoomTypesChange(value as RoomType[])}
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
            {formatCurrency(priceDraft[0], currency)} –{" "}
            {formatCurrency(priceDraft[1], currency)}
          </span>
        </div>
        <Slider
          min={bounds.min}
          max={bounds.max}
          value={priceDraft}
          onValueChange={(value) => {
            const range = value as [number, number];
            setPriceDraft(range);
            commitPrice(range);
          }}
          aria-label="Price range"
        />
      </div>
    </div>
  );
}
