import type { RoomType } from "@/data/contract";
import type { FilterBounds } from "@/data/types";
import { isAllRoomTypes, isPriceCapOpen } from "@/lib/filters/normalize";
import { formatCurrency } from "./format";
import { ROOM_DISPLAY } from "./room-display";

/**
 * Human-readable filter labels — the display tier of the filter vocabulary
 * (`lib/filters/normalize` holds the pure rules; these add the display tokens
 * `ROOM_DISPLAY` + currency, so they live in the feature layer). Shared by the
 * Browse empty state and the filter panel so the wording can't drift.
 */

/** "All room types" for the canonical empty selection, else the joined `short` labels. */
export function roomTypesLabel(roomTypes: RoomType[]): string {
  return isAllRoomTypes(roomTypes)
    ? "All room types"
    : roomTypes.map((type) => ROOM_DISPLAY[type].short).join(", ");
}

/**
 * One-line summary of the active filter — e.g. `Entire · £40–£1,100+`. Takes the
 * *display* (bounded) filters, so the price never formats `Infinity`; a top
 * handle parked at the cap gets a trailing `+` ("and above").
 */
export function filterSummary(
  filters: { roomTypes: RoomType[]; priceRange: [number, number] },
  bounds: FilterBounds,
  currency: string,
): string {
  const [min, max] = filters.priceRange;
  const cap = isPriceCapOpen(filters.priceRange, bounds) ? "+" : "";
  return `${roomTypesLabel(filters.roomTypes)} · ${formatCurrency(min, currency)}–${formatCurrency(max, currency)}${cap}`;
}
