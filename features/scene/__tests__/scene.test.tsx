import { latLngToCell } from "h3-js";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// react-map-gl needs WebGL; mock it at the render boundary (Principle 2) so the
// map's reactions are readable off the layers' `data-*` attributes.
vi.mock("react-map-gl/maplibre", () => import("@/test/mocks/react-map-gl"));

import {
  HEX_FILL_LAYER_ID,
  HEX_SOURCE_ID,
  POINTS_CIRCLE_LAYER_ID,
} from "@/features/scene/map/constants";
import { screen, waitFor } from "@/test/render";

import {
  findListingList,
  findMapLayer,
  getMapLayer,
  getMapSource,
  queryMapLayer,
  within,
} from "./queries";
import {
  failBoundaries,
  failPoints,
  richAggregates,
  setupScene,
} from "./scene-utils";

/**
 * Scene integration over one actor system — the lens switcher, the shared filter
 * panel, the Analyse/Browse sidebar and the map. Two concerns share the setup:
 * cross-region *interaction* (one action fans out, the wiring per-region tests
 * can't see) and the error *notifications* it raises. Both stay off E2E. The map
 * is the Principle-2 render-boundary mock, so its reactions are read off the
 * layers' `data-*` attributes; layers appear after the mock fires `onLoad`, hence
 * the `findBy*`/`waitFor`.
 */

afterEach(() => {
  // Toasts live in sonner's module store and portal outside the render root;
  // clear both so one case's toast can't leak into the next.
  toast.dismiss();
  document.body
    .querySelectorAll("[data-sonner-toaster]")
    .forEach((node) => node.remove());
});

describe("scene cross-region interaction", () => {
  it("flips the map layers when the lens is switched", async () => {
    const scene = setupScene();
    scene.navigateToCity();

    expect(await findMapLayer(HEX_FILL_LAYER_ID)).toHaveAttribute(
      "data-layer-visibility",
      "visible",
    );
    expect(queryMapLayer(POINTS_CIRCLE_LAYER_ID)).toBeNull();

    await scene.user.click(screen.getByRole("radio", { name: "Browse" }));

    expect(await findMapLayer(POINTS_CIRCLE_LAYER_ID)).toHaveAttribute(
      "data-layer-visibility",
      "visible",
    );
    expect(getMapLayer(HEX_FILL_LAYER_ID)).toHaveAttribute(
      "data-layer-visibility",
      "none",
    );

    expect(await axe(scene.container)).toHaveNoViolations();
  });

  it("narrows the listings list and the map points together on a filter change", async () => {
    const scene = setupScene();
    scene.navigateToCity();
    scene.setLens("browse");
    scene.finishCityLoad();

    expect(within(await findListingList()).getAllByRole("button")).toHaveLength(
      3,
    );
    const filterBefore = (
      await findMapLayer(POINTS_CIRCLE_LAYER_ID)
    ).getAttribute("data-layer-filter");

    await scene.user.click(screen.getByRole("button", { name: "Private" }));

    expect(within(await findListingList()).getAllByRole("button")).toHaveLength(
      2,
    );
    expect(
      getMapLayer(POINTS_CIRCLE_LAYER_ID).getAttribute("data-layer-filter"),
    ).not.toEqual(filterBefore);
  });

  it("recomputes the analysis cards and the map hexes together on a filter change", async () => {
    const c1 = latLngToCell(51.5, -0.12, 6);
    const c2 = latLngToCell(51.55, -0.1, 6);
    const scene = setupScene({ defaultAggregates: richAggregates(150) });
    scene.navigateToCity();
    scene.finishCityLoad();
    // Settle the converge-time recomputes so the coalescing slots are free and the
    // filter-driven requests below post (and their replies land) immediately.
    scene.replyHexes([{ h3: c1, count: 5, medianPrice: 150 }]);
    scene.replyAggregates(richAggregates(150));

    // The median KPI headline (the histogram chart can't measure in jsdom, so it
    // shows its own skeleton — its caption isn't a reliable signal here).
    expect(screen.getByText("150")).toBeInTheDocument();
    await waitFor(() =>
      expect(getMapSource(HEX_SOURCE_ID)).toHaveAttribute(
        "data-feature-count",
        "1",
      ),
    );

    await scene.user.click(screen.getByRole("button", { name: "Private" }));
    scene.replyAggregates(richAggregates(222));
    scene.replyHexes([
      { h3: c1, count: 5, medianPrice: 150 },
      { h3: c2, count: 9, medianPrice: 300 },
    ]);

    expect(await screen.findByText("222")).toBeInTheDocument();
    await waitFor(() =>
      expect(getMapSource(HEX_SOURCE_ID)).toHaveAttribute(
        "data-feature-count",
        "2",
      ),
    );
  });
});

describe("scene error notifications", () => {
  it("toasts when the listings fetch fails", async () => {
    failPoints();
    const scene = setupScene();
    scene.navigateToCity();
    scene.setLens("browse"); // browse lens triggers the /points fetch

    expect(
      await screen.findByText("Couldn't load listings"),
    ).toBeInTheDocument();
    expect(
      await axe(screen.getByRole("region", { name: /notifications/i })),
    ).toHaveNoViolations();
  });

  it("toasts when the boundaries fetch fails", async () => {
    failBoundaries();
    const scene = setupScene();
    scene.navigateToCity(); // the map's neighbourhoods layer fetches /boundaries

    expect(
      await screen.findByText("Couldn't load map areas"),
    ).toBeInTheDocument();
  });

  it("toasts when the city's data load fails", async () => {
    const scene = setupScene();
    scene.navigateToCity();
    scene.failCityLoad();

    expect(
      await screen.findByText("Couldn't load this city"),
    ).toBeInTheDocument();
  });

  it("toasts when a recompute fails", async () => {
    const scene = setupScene();
    scene.navigateToCity();
    scene.finishCityLoad();
    scene.failProcess();

    expect(
      await screen.findByText("Couldn't update the view"),
    ).toBeInTheDocument();
  });

  it("shows a single toast when the same source fails repeatedly", async () => {
    const scene = setupScene();
    scene.navigateToCity();
    scene.finishCityLoad();
    scene.failProcess();
    scene.failProcess();

    expect(
      await screen.findByText("Couldn't update the view"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Couldn't update the view")).toHaveLength(1);
  });

  it("shows distinct toasts for distinct sources", async () => {
    failPoints();
    failBoundaries();
    const scene = setupScene();
    scene.navigateToCity();
    scene.setLens("browse");

    expect(
      await screen.findByText("Couldn't load listings"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Couldn't load map areas"),
    ).toBeInTheDocument();
  });
});
