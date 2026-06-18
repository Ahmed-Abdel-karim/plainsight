import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { datasetFixture } from "@/test/fixtures/dataset";
import { MarketHeader } from "./market-header";

describe("MarketHeader", () => {
  it("renders the market title, active count, and snapshot together", () => {
    render(
      <MarketHeader
        cityName={datasetFixture.name}
        listingCount={datasetFixture.cityAggregates.listingCount}
        snapshotLabel={datasetFixture.snapshotLabel}
      />,
    );

    const header = screen.getByRole("banner");

    expect(
      within(header).getByRole("heading", { level: 1, name: "London" }),
    ).toBeInTheDocument();
    expect(within(header).getByText("1,000 listings")).toBeInTheDocument();
    expect(
      within(header).getByText("Data: 9/2025 snapshot"),
    ).toBeInTheDocument();
  });

  it("renders the honest trimmed snapshot label without live framing", () => {
    render(
      <MarketHeader
        cityName={datasetFixture.name}
        listingCount={datasetFixture.cityAggregates.listingCount}
        snapshotLabel={datasetFixture.snapshotLabel}
      />,
    );

    const headerText = screen.getByRole("banner").textContent?.toLowerCase();

    expect(screen.getByText("Data: 9/2025 snapshot")).toBeInTheDocument();
    expect(headerText).toBeDefined();
    expect(headerText).not.toMatch(/\b(live|current|real-time)\b/);
    expect(headerText).not.toMatch(/\b(is|are) now\b/);
  });

  it("formats the aggregate-derived count passed by props", () => {
    render(
      <MarketHeader
        cityName="London"
        listingCount={1000}
        snapshotLabel={datasetFixture.snapshotLabel}
      />,
    );

    expect(screen.getByText("1,000 listings")).toBeInTheDocument();
  });
});
