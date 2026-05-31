import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { datasetFixture } from "@/test/fixtures/dataset";
import { MarketHeader } from "./market-header";

describe("MarketHeader accessibility", () => {
  it("has no axe violations and exposes the heading and polite live region", async () => {
    const { container } = render(
      <MarketHeader
        cityName={datasetFixture.name}
        listingCount={datasetFixture.cityAggregates.listingCount}
        snapshotLabel={datasetFixture.snapshotLabel}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "London" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(await axe(container)).toHaveNoViolations();
  });
});
