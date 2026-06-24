import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/dynamic", async () => {
  const { createElement, lazy, Suspense } = await import("react");

  return {
    default: (loader: () => Promise<React.ComponentType>) => {
      const Component = lazy(async () => ({ default: await loader() }));

      return function TestDynamicComponent(props: Record<string, unknown>) {
        return createElement(
          Suspense,
          { fallback: null },
          createElement(Component, props),
        );
      };
    },
  };
});

import { screen } from "@/test/render";

import {
  getChartCard,
  getLoadingStatus,
  queryLoadingStatus,
  within,
} from "./queries";
import { makeAggregates, makeRichAggregates } from "./data";
import { setupAnalysis } from "./utils";

/**
 * Analysis region integration test — the four distribution cards rendered over
 * the real actor system. Recharts' hover strip and keyboard navigation need a
 * real pointer/browser, so they are E2E; here we assert the cards' data.
 */
describe("analysis region", () => {
  it("renders the four cards with formatted headlines from the default aggregates", async () => {
    const scene = setupAnalysis();
    scene.navigateToCity();
    scene.finishCityLoad();

    // KPI headlines (the symbol and amount render as separate spans).
    expect(screen.getByText("£")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("1.2")).toBeInTheDocument();
    expect(screen.getByText("Median price")).toBeInTheDocument();
    expect(screen.getByText("Multi-host share")).toBeInTheDocument();
    expect(screen.getByText("Reviews / month")).toBeInTheDocument();

    const roomMix = within(getChartCard("Room-type mix"));
    expect(roomMix.getByText("Entire")).toBeInTheDocument();
    expect(roomMix.getByText("60%")).toBeInTheDocument();
    expect(roomMix.getByText("Private")).toBeInTheDocument();
    expect(roomMix.getByText("30%")).toBeInTheDocument();

    // The price + top-hosts charts load lazily (next/dynamic, ssr:false), so
    // await their content rather than querying the loading skeleton.
    expect(await screen.findByText(/median £150/)).toBeInTheDocument();
    expect(
      await screen.findByText(/42% run by multi-listing hosts/),
    ).toBeInTheDocument();

    expect(await axe(scene.container)).toHaveNoViolations();
  });

  it("degrades gracefully below the listing floor", async () => {
    const scene = setupAnalysis({ defaultAggregates: makeAggregates() });
    scene.navigateToCity();
    scene.finishCityLoad();

    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getAllByText("too few listings")).toHaveLength(3);
    expect(
      screen.getAllByText("Too few listings to characterise."),
    ).toHaveLength(3);

    expect(await axe(scene.container)).toHaveNoViolations();
  });

  it("shows an accessible loading state on the cold filtered path, then the filtered numbers", async () => {
    const scene = setupAnalysis({ filter: { roomTypes: ["Entire home/apt"] } });
    scene.navigateToCity();
    scene.finishCityLoad();

    const loading = getLoadingStatus();
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading).toHaveTextContent(/loading distributions/i);

    scene.replyAggregates(makeRichAggregates({ medianPrice: 99 }));

    expect(queryLoadingStatus()).toBeNull();
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(await axe(scene.container)).toHaveNoViolations();
  });

  it("keeps the last-good numbers (not the skeleton) while a filter change recomputes", () => {
    const scene = setupAnalysis({ filter: { roomTypes: ["Entire home/apt"] } });
    scene.navigateToCity();
    scene.finishCityLoad();
    scene.replyAggregates(makeRichAggregates({ medianPrice: 99 }));
    expect(screen.getByText("99")).toBeInTheDocument();

    scene.setRoomTypes(["Private room"]);

    // Stale-while-revalidate: the skeleton is the cold-path branch only, so the
    // last result stays put until the next one lands.
    expect(queryLoadingStatus()).toBeNull();
    expect(screen.getByText("99")).toBeInTheDocument();

    scene.replyAggregates(makeRichAggregates({ medianPrice: 77 }));

    expect(screen.getByText("77")).toBeInTheDocument();
    expect(screen.queryByText("99")).toBeNull();
  });
});
