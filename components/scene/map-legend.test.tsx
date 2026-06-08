import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// Prevent the cross-slice triggerRequestHexes subscription from spinning up the
// Web Worker (not available in jsdom) when the map store is seeded with a city.
vi.mock("@/lib/listings/client", () => {
  class CityListingsClient {
    dispose = vi.fn();
    requestProcess = vi.fn();
  }
  return { CityListingsClient };
});

import { type MapCityPayload, useSceneStore } from "@/components/scene/stores";
import { MapLegend } from "./map-legend";

/**
 * The count now flows from the shared map store (set by `MapDataSync`) rather
 * than a prop, so each case seeds the store before rendering and resets it after.
 */
function seedCity(neighbourhoodCount: number) {
  const city: MapCityPayload = {
    slug: "london",
    cityName: "London",
    boundaries: null,
    bbox: [-0.51, 51.28, 0.33, 51.69],
    center: [-0.09, 51.5],
    neighbourhoodCount,
    priceScale: { breaks: [80, 120, 180, 280], min: 20, max: 1000 },
    priceCap: 500,
    currency: "GBP",
    snapshotLabel: " 9/2025",
  };
  useSceneStore.setState({ city });
}

describe("MapLegend", () => {
  afterEach(() => {
    useSceneStore.setState({ city: null });
  });

  it("renders the neighbourhood heading and count", () => {
    seedCity(22);
    render(<MapLegend />);

    expect(
      screen.getByRole("complementary", { name: "Map legend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Neighbourhoods" }),
    ).toBeInTheDocument();
    expect(screen.getByText("22 neighbourhoods")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    seedCity(1);
    const { container } = render(<MapLegend />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
