import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrowsePointProperties } from "@/data/contract";
import { ListingDetailBody } from "./listing-detail-body";

function makeListing(
  overrides: Partial<BrowsePointProperties> = {},
): BrowsePointProperties {
  return {
    id: 42,
    name: "Bright loft",
    price: 120,
    roomType: "Entire home/apt",
    neighbourhoodId: "centre",
    hostName: "Ada",
    hostListingsCount: 3,
    reviewsPerMonth: 1.4,
    numberOfReviews: 57,
    minNights: 3,
    imageVariant: 0,
    ...overrides,
  };
}

describe("ListingDetailBody", () => {
  it("renders host (+ multi-host), reviews, count, min nights and provenance — never availability", () => {
    render(
      <ListingDetailBody listing={makeListing()} snapshotLabel=" 9/2025" />,
    );

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Host has two or more listings"),
    ).toHaveTextContent("2+");
    expect(screen.getByText("Reviews / month")).toBeInTheDocument();
    expect(screen.getByText("1.4")).toBeInTheDocument();
    expect(screen.getByText("Review count")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();
    expect(screen.getByText("Minimum nights")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByText(/Listing #42 · Inside Airbnb · 9\/2025 snapshot/),
    ).toBeInTheDocument();

    // research D3: availability is not in the dataset and must never be shown.
    expect(screen.queryByText(/availability/i)).toBeNull();
    expect(screen.queryByText(/365/)).toBeNull();
  });

  it("falls back to an em-dash for a null review rate and hides the tag for a single-listing host", () => {
    render(
      <ListingDetailBody
        listing={makeListing({ hostListingsCount: 1, reviewsPerMonth: null })}
        snapshotLabel="2025"
      />,
    );

    expect(screen.queryByLabelText("Host has two or more listings")).toBeNull();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
