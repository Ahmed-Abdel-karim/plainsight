import { describe, expect, it } from "vitest";

import type { Listing } from "@/data/contract";

import { projectPoints } from "./split-city-data";

let nextId = 1;
function makeListing(overrides: Partial<Listing> = {}): Listing {
  const id = nextId++;
  return {
    id,
    name: `Listing ${id}`,
    hostId: id,
    hostName: `Host ${id}`,
    neighbourhoodId: "centre",
    lat: 51.5,
    lng: -0.12,
    roomType: "Entire home/apt",
    price: 100,
    minNights: 1,
    numberOfReviews: 0,
    reviewsPerMonth: null,
    hostListingsCount: 1,
    imageVariant: 0,
    h3: "8a1fb46622dffff",
    ...overrides,
  };
}

describe("projectPoints", () => {
  it("emits one Point feature per listing (1:1)", () => {
    const listings = [makeListing(), makeListing(), makeListing()];
    const fc = projectPoints(listings);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(listings.length);
    expect(fc.features.every((f) => f.geometry.type === "Point")).toBe(true);
  });

  it("uses [lng, lat] GeoJSON coordinate order", () => {
    const fc = projectPoints([makeListing({ lng: -0.5, lat: 51.4 })]);
    expect(fc.features[0].geometry.coordinates).toEqual([-0.5, 51.4]);
  });

  it("carries the row/drawer fields and drops h3 + availability", () => {
    const fc = projectPoints([
      makeListing({
        id: 42,
        price: 175,
        roomType: "Private room",
        reviewsPerMonth: 1.4,
        hostListingsCount: 3,
      }),
    ]);
    const props = fc.features[0].properties;
    expect(props).toMatchObject({
      id: 42,
      price: 175,
      roomType: "Private room",
      reviewsPerMonth: 1.4,
      hostListingsCount: 3,
    });
    // The Browse tier is a Listing minus h3, plus NO availability (research D3).
    expect("h3" in props).toBe(false);
    expect("availability" in props).toBe(false);
  });
});
