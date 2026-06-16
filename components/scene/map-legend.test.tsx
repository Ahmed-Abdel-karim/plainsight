import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("@/components/scene/state", () => ({
  useCityFraming: vi.fn(),
}));

import { useCityFraming } from "@/components/scene/state";
import type { MapCityPayload } from "@/data/types";
import { MapLegend } from "./map-legend";

const mockUseCityFraming = vi.mocked(useCityFraming);

function renderWithCity(neighbourhoodCount: number) {
  const city: MapCityPayload = {
    slug: "london",
    cityName: "London",
    bbox: [-0.51, 51.28, 0.33, 51.69],
    center: [-0.09, 51.5],
    neighbourhoodCount,
    priceScale: { breaks: [80, 120, 180, 280], min: 20, max: 1000 },
    priceCap: 500,
    currency: "GBP",
    snapshotLabel: " 9/2025",
  };
  mockUseCityFraming.mockReturnValue(city);
  return render(<MapLegend />);
}

describe("MapLegend", () => {
  it("renders the neighbourhood heading and count", () => {
    renderWithCity(22);

    expect(
      screen.getByRole("complementary", { name: "Map legend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Neighbourhoods" }),
    ).toBeInTheDocument();
    expect(screen.getByText("22 neighbourhoods")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithCity(1);

    expect(await axe(container)).toHaveNoViolations();
  });
});
