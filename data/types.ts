import type { RoomType } from "./contract";

/** UI-facing city shape for the city picker (maps from CityIndexEntry). */
export interface CityData {
  slug: string;
  name: string;
  country: string;
  frame: string;
  listings: string; // formatted count, e.g. "6,562 listings"
  snapshotLabel: string;
}

/** Active filter state shared across both Analyse and Browse modes (E7). */
export interface ListingFilters {
  roomTypes: RoomType[]; // empty array = all types included
  priceRange: [number, number]; // [min, max] in city currency
}

/** Sort options for the Browse listing list (E6-S5). */
export type SortKey =
  | "price_asc"
  | "price_desc"
  | "reviews_desc"
  | "review_count_desc";

/** Analysis scope — city-wide or drilled into one neighbourhood (E4). */
export type Scope = { type: "city" } | { type: "neighbourhood"; id: string };
