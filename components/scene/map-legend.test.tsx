import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  type MapCityPayload,
  useMapStore,
} from "@/components/scene/map/map-store";
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
    currency: "GBP",
  };
  useMapStore.setState({ city });
}

describe("MapLegend", () => {
  afterEach(() => {
    useMapStore.setState({ city: null });
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
