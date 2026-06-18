import type { BrowsePoint, BrowsePointProperties } from "@/data/contract";
import type { MapCityPayload } from "@/data/types";
import type { NeighbourhoodBoundaries } from "@/lib/geo/types";
import type { BrowseCollection } from "@/components/scene/browse/use-browse-points";

/**
 * Tiny browse-tier fixtures: one city framing and a three-row points collection
 * chosen to exercise the contracts — price sort order, a multi-listing host, a
 * null review rate — plus a single-neighbourhood boundaries tier (centre → Centre).
 */

/** A `MapCityPayload` (city framing) for `CITY.CHANGED`; override per test. */
export function makeMapCityPayload(
  overrides: Partial<MapCityPayload> = {},
): MapCityPayload {
  return {
    slug: "london",
    cityName: "London",
    bbox: [-0.51, 51.28, 0.33, 51.69],
    center: [-0.12, 51.5],
    neighbourhoodCount: 1,
    priceScale: { breaks: [50, 100, 150, 200], min: 10, max: 500 },
    priceCap: 450,
    currency: "GBP",
    snapshotLabel: " 9/2025",
    ...overrides,
  };
}

function point(
  properties: BrowsePointProperties,
  coordinates: [number, number],
): BrowsePoint {
  return {
    type: "Feature",
    id: properties.id,
    geometry: { type: "Point", coordinates },
    properties,
  };
}

export const browsePointsFixture: BrowseCollection = {
  type: "FeatureCollection",
  features: [
    point(
      {
        id: 42,
        name: "Bright loft",
        price: 120,
        roomType: "Entire home/apt",
        neighbourhoodId: "centre",
        hostName: "Ada",
        hostListingsCount: 3, // multi-listing host → "2+" badge
        reviewsPerMonth: 1.4,
        numberOfReviews: 57,
        minNights: 3,
        imageVariant: 0,
      },
      [-0.1, 51.51],
    ),
    point(
      {
        id: 7,
        name: "Cosy room",
        price: 60,
        roomType: "Private room",
        neighbourhoodId: "centre",
        hostName: "Bo",
        hostListingsCount: 1, // single-listing host → no badge
        reviewsPerMonth: null, // → em-dash fallback
        numberOfReviews: 4,
        minNights: 1,
        imageVariant: 1,
      },
      [-0.12, 51.5],
    ),
    point(
      {
        id: 99,
        name: "Riverside flat",
        price: 200,
        roomType: "Entire home/apt",
        neighbourhoodId: "centre",
        hostName: "Cy",
        hostListingsCount: 2,
        reviewsPerMonth: 0.5,
        numberOfReviews: 12,
        minNights: 2,
        imageVariant: 2,
      },
      [-0.08, 51.52],
    ),
  ],
};

export const boundariesFixture: NeighbourhoodBoundaries = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "centre",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-0.2, 51.4],
              [0.0, 51.4],
              [0.0, 51.6],
              [-0.2, 51.6],
              [-0.2, 51.4],
            ],
          ],
        ],
      },
      properties: { id: "centre", name: "Centre" },
    },
  ],
};
