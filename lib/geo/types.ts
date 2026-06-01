/**
 * Plainsight — Geospatial types
 * -----------------------------------------------------------------------------
 * Single home for all hand-written geospatial shapes: coordinate primitives and
 * the neighbourhood boundary GeoJSON contract. Runtime-erased TypeScript only,
 * so it is safe to import from server or client code.
 */

import type { FeatureCollection, MultiPolygon } from "geojson";

/** Geographic bounding box: [minLng, minLat, maxLng, maxLat]. */
export type BBox = [number, number, number, number];

/** A single geographic coordinate: [longitude, latitude] (e.g. a map center). */
export type LngLat = [number, number];

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
