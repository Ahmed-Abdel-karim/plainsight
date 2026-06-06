import { ROOM_TYPES, type RoomType } from "@/data/contract";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "../format";
import { type FilterBounds } from "../use-filters";

const ROOM_LABEL: Record<RoomType, string> = {
  "Entire home/apt": "Entire",
  "Private room": "Private",
  "Shared room": "Shared",
  "Hotel room": "Hotel",
};

/**
 * Filter panel. Owns its filter ↔ URL state directly via `useFilters` (shared
 * with the Analyse cards + Browse list through the nuqs URL params, not props),
 * so it renders once above both tabs and stays in sync with them. Room-type
 * toggles commit immediately (discrete); the price slider drags on instant local
 * state and commits the range after the drag settles (debounced), so the URL
 * write + worker recompute fire once. An empty room selection means "all".
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
              {ROOM_LABEL[type]}
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
