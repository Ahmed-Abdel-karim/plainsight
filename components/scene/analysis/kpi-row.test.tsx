import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeAggregates } from "@/test/fixtures/dataset";
import { KpiRow } from "./kpi-row";

describe("KpiRow", () => {
  it("renders the unfiltered headline metrics with formatted values", () => {
    render(
      <KpiRow
        currency="GBP"
        aggregates={makeAggregates({
          listingCount: 1000,
          meetsFloor: true,
          medianPrice: 150,
          multiListingHostShare: 0.42,
          avgReviewsPerMonth: 1.2,
        })}
      />,
    );

    // Price symbol and amount render as separate spans (the £ is a small unit).
    expect(screen.getByText("£")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("1.2")).toBeInTheDocument();

    expect(screen.getByText("Median price")).toBeInTheDocument();
    expect(screen.getByText("Multi-host share")).toBeInTheDocument();
    expect(screen.getByText("Reviews / month")).toBeInTheDocument();
  });

  it("falls back gracefully below the listing floor", () => {
    render(<KpiRow currency="GBP" aggregates={makeAggregates()} />);

    // All three metrics are null below the floor → em-dash + a 'too few' meta.
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getAllByText("too few listings")).toHaveLength(3);
  });
});
