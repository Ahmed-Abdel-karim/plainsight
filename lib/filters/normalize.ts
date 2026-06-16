import { ROOM_TYPES, type RoomType } from "@/data/contract";
import type {
  FilterBounds,
  ListingFilters,
  MapCityPayload,
} from "@/data/types";

/**
 * The single codec for the app's canonical *stored* filter form and its
 * *resolved* form. The stored form encodes "no constraint" as an absence:
 *
 *   - `roomTypes: []`   means **all** room types (no room-type filter);
 *   - `priceRange: null` means the **full** city price range (no price filter).
 *
 * Storing it this way lets the URL layer drop default params and the UI show a
 * "default" state — but every consumer (city machine, selector hooks, filter
 * panel, Browse) was re-expressing the collapse/expand rules inline and could
 * drift. These pure helpers are the one place those rules live; pair them with
 * `filterListings` (./filter), which applies a *resolved* filter to rows.
 */

/** The stored (normalized) filter fields these helpers read. */
export interface StoredFilter {
  roomTypes: RoomType[];
  priceRange: [number, number] | null;
}

/** A city's inclusive price bounds — the values a null `priceRange` resolves to. */
export function priceBounds(
  framing: Pick<MapCityPayload, "priceScale" | "priceCap"> | null,
): FilterBounds {
  return framing
    ? { min: framing.priceScale.min, max: framing.priceCap }
    : { min: 0, max: 0 };
}

// --- room types (canonical: [] = all) ---

/** No room-type constraint (the stored "all types" form). */
export function isAllRoomTypes(roomTypes: readonly RoomType[]): boolean {
  return roomTypes.length === 0;
}

/** Collapse an all-selected list to the canonical `[]`; otherwise pass through. */
export function normalizeRoomTypes(selected: RoomType[]): RoomType[] {
  return selected.length === ROOM_TYPES.length ? [] : selected;
}

/** Expand the canonical `[]` to every room type — for display / iteration. */
export function expandRoomTypes(roomTypes: RoomType[]): RoomType[] {
  return roomTypes.length === 0 ? [...ROOM_TYPES] : roomTypes;
}

// --- price range (canonical: null = full range) ---

/** Collapse a full-bounds range to the canonical `null`; otherwise pass through. */
export function normalizePriceRange(
  range: [number, number] | null,
  bounds: FilterBounds,
): [number, number] | null {
  return range && range[0] === bounds.min && range[1] === bounds.max
    ? null
    : range;
}

/** Resolve a stored (maybe-null) range to a concrete `[min, max]` band. */
export function resolvePriceRange(
  range: [number, number] | null,
  bounds: FilterBounds,
): [number, number] {
  return range ?? [bounds.min, bounds.max];
}

// --- combined ---

/** Resolve the stored filter to the concrete `ListingFilters` the worker /
 *  predicates consume (null price → full range). */
export function resolveFilters(
  filter: StoredFilter,
  bounds: FilterBounds,
): ListingFilters {
  return {
    roomTypes: filter.roomTypes,
    priceRange: resolvePriceRange(filter.priceRange, bounds),
  };
}

/** True when the stored filter applies no constraint at all (all types + full
 *  price range) — i.e. the city's default view. */
export function isDefaultFilters(
  filter: StoredFilter,
  bounds: FilterBounds,
): boolean {
  return (
    isAllRoomTypes(filter.roomTypes) &&
    normalizePriceRange(filter.priceRange, bounds) === null
  );
}
