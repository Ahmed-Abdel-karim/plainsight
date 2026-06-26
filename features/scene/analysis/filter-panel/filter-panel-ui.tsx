import { ROOM_TYPES, type RoomType } from "@/data/contract";
import type { FilterBounds } from "@/data/types";
import { isPriceCapOpen } from "@/lib/filters/normalize";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "../../shared/format";
import { ROOM_DISPLAY } from "../../shared/room-display";

/**
 * Presentational filter controls. State is supplied by `FilterPanel`, which
 * shares filter state with Analyse, Browse, and URL sync through the scene actor
 * system. An empty room selection means "all".
 *
 * Only the static, server-derived `bounds` + `currency` come in as props (threaded
 * from the page's cached meta read); everything filter-shaped lives here.
 */
export function FilterPanelUi({
  bounds,
  currency,
  selectedRooms,
  disabled,
  reset,
  onRoomChange,
  priceRange,
  onPriceChange,
}: {
  bounds: FilterBounds;
  currency: string;
  selectedRooms: RoomType[];
  disabled?: boolean;
  reset?: () => void;
  onRoomChange?: (value: string[]) => void;
  priceRange: number[];
  onPriceChange?: (value: number[]) => void;
}) {
  return (
    <div className="flex flex-col gap-stack rounded-lg border border-border px-gutter py-gutter">
      <div className="flex items-baseline justify-between">
        <h2 className="text-muted-foreground type-label">Filters</h2>
        <Button variant="ghost" size="xs" disabled={disabled} onClick={reset}>
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
          onValueChange={onRoomChange}
          className="w-full"
          aria-label="Room type"
        >
          {ROOM_TYPES.map((type) => (
            <ToggleGroupItem key={type} value={type} className="flex-1">
              {ROOM_DISPLAY[type].short}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-snug">
        <div className="flex items-baseline justify-between">
          <span className="type-caption text-muted-foreground">Price</span>
          <span className="type-caption-mono text-foreground tabular-nums">
            {formatCurrency(priceRange[0], currency)} –{" "}
            {formatCurrency(priceRange[1], currency)}
            {/* Cap is a 99th-pct UI ceiling; the top handle there means "and above". */}
            {isPriceCapOpen([priceRange[0], priceRange[1]], bounds) ? "+" : ""}
          </span>
        </div>
        <Slider
          min={bounds.min}
          max={bounds.max}
          value={priceRange}
          onValueChange={onPriceChange}
          aria-label="Price range"
        />
      </div>
    </div>
  );
}
