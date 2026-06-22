import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// react-map-gl needs WebGL; mock it at the render boundary (Principle 2).
vi.mock("react-map-gl/maplibre", () => import("@/test/mocks/react-map-gl"));

import { screen, waitFor } from "@/test/render";

import {
  getMapLayer,
  getMapLegend,
  getMapRegion,
  getMapSkeleton,
  getMapSource,
  getMarketHeader,
  getLoadingOverlay,
  queryLoadingOverlay,
  queryMapLayer,
  queryMapSkeleton,
  within,
} from "./queries";
import { setupMap } from "./utils";

/**
 * Map region integration test — the canvas, market header, and legend over the real
 * machines, with react-map-gl mocked. Real pointer hit-testing and the actual WebGL
 * paint are E2E; the transition gate is proven at the machine tier, so it is not
 * re-asserted here.
 */
describe("map region", () => {
  it("shows an accessible skeleton with no city, then the map once a city is framed", () => {
    const scene = setupMap();

    expect(getMapSkeleton()).toHaveAttribute("role", "status");

    scene.navigateToCity();

    expect(queryMapSkeleton()).toBeNull();
    expect(getMapRegion("London")).toBeInTheDocument();
    expect(
      scene.map
        .getSnapshot()
        .matches({ lifecycle: "ready", interaction: "interactive" }),
    ).toBe(true);
  });

  it("in the analyse lens, hands the map the hex layer and the neighbourhoods source", async () => {
    const scene = setupMap();
    scene.navigateToCity();

    await waitFor(() =>
      expect(getMapSource("neighbourhoods")).toHaveAttribute(
        "data-feature-count",
        "1",
      ),
    );
    expect(getMapLayer("hex-price-fill")).toHaveAttribute(
      "data-layer-visibility",
      "visible",
    );
    // The browse dots aren't fetched or mounted outside the browse lens.
    expect(queryMapLayer("browse-points-circle")).toBeNull();
  });

  it("in the browse lens, hands the map the points source with a filter and hides the hex layer", async () => {
    const scene = setupMap();
    scene.navigateToCity();
    scene.setLens("browse");

    const points = await screen.findByTestId("map-source-browse-points");
    await waitFor(() =>
      expect(points).toHaveAttribute("data-feature-count", "3"),
    );
    expect(points).toHaveAttribute("data-promote-id", "id");

    const circle = getMapLayer("browse-points-circle");
    expect(circle).toHaveAttribute("data-layer-visibility", "visible");
    expect(circle).toHaveAttribute("data-layer-filter");
    expect(getMapLayer("hex-price-fill")).toHaveAttribute(
      "data-layer-visibility",
      "none",
    );

    expect(await axe(scene.container)).toHaveNoViolations();
  });

  it("dims behind an accessible loading overlay during a city switch, then clears it", () => {
    const scene = setupMap();
    scene.navigateToCity();

    scene.startCitySwitch();
    expect(getLoadingOverlay("London")).toBeInTheDocument();

    scene.finishCitySwitch();
    expect(queryLoadingOverlay("London")).toBeNull();
  });

  it("frames the map to the city bounds through the real component wiring", () => {
    const scene = setupMap();
    scene.navigateToCity();

    const instance = scene.getMapInstance();
    expect(instance?.fitBounds).toHaveBeenCalled();
    expect(instance?.setMaxBounds).toHaveBeenCalled();
  });

  it.each([
    { count: 1, label: "1 neighbourhood" },
    { count: 22, label: "22 neighbourhoods" },
  ])(
    "names the neighbourhood count in the legend ($label)",
    ({ count, label }) => {
      const scene = setupMap({ framing: { neighbourhoodCount: count } });
      scene.navigateToCity();

      const legend = getMapLegend();
      expect(
        within(legend).getByRole("heading", { name: "Neighbourhoods" }),
      ).toBeInTheDocument();
      expect(within(legend).getByText(label)).toBeInTheDocument();
    },
  );

  it("shows an honest snapshot market header that never implies live data", () => {
    setupMap();

    const header = getMarketHeader();
    expect(
      within(header).getByRole("heading", { level: 1, name: "London" }),
    ).toBeInTheDocument();

    const count = within(header).getByRole("status");
    expect(count).toHaveAttribute("aria-live", "polite");
    expect(count).toHaveTextContent("1,000 listings");
    expect(
      within(header).getByText("Data: 9/2025 snapshot"),
    ).toBeInTheDocument();

    const text = header.textContent?.toLowerCase() ?? "";
    expect(text).not.toMatch(/\b(live|current|real-time)\b/);
    expect(text).not.toMatch(/\b(is|are) now\b/);
  });
});
