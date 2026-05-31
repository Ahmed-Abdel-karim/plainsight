/**
 * Plainsight — Data Contract
 * -----------------------------------------------------------------------------
 * Single source of truth shared by the build pipeline (producer) and the
 * frontend (consumer). The UI NEVER parses raw Inside Airbnb files; it only
 * reads the shapes below, emitted as static JSON to /public/data.
 *
 * Locked decisions:
 *  - multi-listing host = calculated_host_listings_count >= 2
 *  - minimum-listing floor = 20  (suppresses concentration + greys out price area)
 *  - avg reviews/month = mean of reviews_per_month over REVIEWED listings only
 *  - median (not mean) price; quantile (quintile) breaks for the choropleth
 *  - out-of-polygon listings -> neighbourhoodId = UNASSIGNED_ID (in totals,
 *    not drill-down-selectable)
 */

import type { FeatureCollection, MultiPolygon } from "geojson";

export const MIN_LISTING_FLOOR = 20;
export const MULTI_LISTING_THRESHOLD = 2;
export const PRICE_CAP_PERCENTILE = 0.99;
export const QUANTILE_BREAKS = 5;
export const UNASSIGNED_ID = "__unassigned__";

export type RoomType =
  | "Entire home/apt"
  | "Private room"
  | "Shared room"
  | "Hotel room";

export const ROOM_TYPES: readonly RoomType[] = [
  "Entire home/apt",
  "Private room",
  "Shared room",
  "Hotel room",
] as const;

export interface Listing {
  id: number;
  name: string;
  hostId: number;
  hostName: string | null;
  /** Neighbourhood assigned by build-time point-in-polygon. UNASSIGNED_ID if outside all polygons. */
  neighbourhoodId: string;
  lat: number;
  lng: number;
  roomType: RoomType;
  price: number;
  minNights: number;
  numberOfReviews: number;
  reviewsPerMonth: number | null;
  hostListingsCount: number;
  /** Stable placeholder image bucket (0..n) chosen by id; resolved to an asset by the UI. */
  imageVariant: number;
  /** Precomputed H3 cell for the hex lens; null if hex layer disabled for the city. */
  h3?: string | null;
}

export interface ScopeAggregates {
  listingCount: number;
  medianPrice: number | null;
  /** % of listings whose host has >= MULTI_LISTING_THRESHOLD listings. null below floor. */
  multiListingHostShare: number | null;
  /** Mean reviews_per_month over reviewed listings only. null if none reviewed. */
  avgReviewsPerMonth: number | null;
  /** Whether this scope clears MIN_LISTING_FLOOR. */
  meetsFloor: boolean;
  roomTypeMix: Record<RoomType, number>;
  /** Top hosts by listing count. Empty below floor. */
  topHosts: Array<{ hostId: number; hostName: string | null; count: number }>;
  /** Histogram bins for the price distribution. */
  priceHistogram: Array<{ x0: number; x1: number; count: number }>;
}

export interface Neighbourhood {
  id: string;
  name: string;
  /** Median price for the choropleth fill. null if below floor (greyed out). */
  medianPrice: number | null;
  listingCount: number;
  meetsFloor: boolean;
}

export interface PriceScale {
  breaks: number[];
  min: number;
  max: number;
}

export interface CityDataset {
  slug: string;
  name: string;
  country: string;
  frame: string;
  snapshotLabel: string;
  currency: string;
  bbox: [number, number, number, number];
  center: [number, number];
  hexEnabled: boolean;
  priceScale: PriceScale;
  priceCap: number;
  cityAggregates: ScopeAggregates;
  neighbourhoods: Neighbourhood[];
  neighbourhoodAggregates: Record<string, ScopeAggregates>;
  listings: Listing[];
}

export interface CityIndexEntry {
  slug: string;
  name: string;
  country: string;
  frame: string;
  snapshotLabel: string;
  listingCount: number;
}

/** Properties on each neighbourhood polygon feature in the boundaries GeoJSON. */
export interface NeighbourhoodBoundaryProperties {
  id: string; // slug — matches Neighbourhood.id and Listing.neighbourhoodId
  name: string; // display name
}

/**
 * GeoJSON FeatureCollection emitted to /public/data/{slug}-boundaries.geojson.
 * feature.id = slug, enabling MapLibre setFeatureState for choropleth repaint.
 */
export type NeighbourhoodBoundaries = FeatureCollection<
  MultiPolygon,
  NeighbourhoodBoundaryProperties
>;
