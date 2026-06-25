import type { PriceScale, RoomType } from "./contract";
import type { BBox, LngLat } from "@/lib/geo/types";

/** UI-facing city shape for the city picker (maps from CityIndexEntry). */
export interface CityData {
  slug: string;
  snapshotId: string;
  name: string;
  country: string;
  frame: string;
  listings: string; // formatted count, e.g. "6,562 listings"
  snapshotLabel: string;
}

/** Active filter state shared across both Analyse and Browse modes. */
export interface ListingFilters {
  roomTypes: RoomType[]; // empty array = all types included
  priceRange: [number, number]; // [min, max] in city currency
}

/** Inclusive price bounds for a city, used to resolve a null priceRange. */
export interface FilterBounds {
  min: number;
  max: number;
}

/** Sort options for the Browse listing list. */
export type SortKey =
  | "price_asc"
  | "price_desc"
  | "reviews_desc"
  | "review_count_desc";

/** City framing streamed from the server to seed the city machine on each nav. */
export interface MapCityPayload {
  slug: string;
  snapshotId: string;
  cityName: string;
  bbox: BBox;
  center: LngLat;
  neighbourhoodCount: number;
  /** Unfiltered city-wide listing total — the city-scope header count. */
  cityListingCount: number;
  /** Unfiltered listing total per neighbourhood id, so the client header/trigger
   *  follows a neighbourhood selection without a server round trip. */
  neighbourhoodListingCounts: Record<string, number>;
  priceScale: PriceScale;
  priceCap: number;
  currency: string;
  snapshotLabel: string;
}
