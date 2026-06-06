import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BrowsePointProperties } from "@/data/contract";
import { ListingCard } from "./listing-card";

function makeListing(
  overrides: Partial<BrowsePointProperties> = {},
): BrowsePointProperties {
  return {
    id: 1,
    name: "Bright loft",
    price: 120,
    roomType: "Entire home/apt",
    neighbourhoodId: "centre",
    hostName: "Ada",
    hostListingsCount: 1,
    reviewsPerMonth: 1.2,
    numberOfReviews: 10,
    minNights: 2,
    imageVariant: 0,
    ...overrides,
  };
}

const noop = () => {};

describe("ListingCard", () => {
  it("exposes the listing as a button with an accessible name (room label, not colour alone)", () => {
    render(
      <ListingCard
        listing={makeListing()}
        neighbourhoodName="Centre"
        currency="GBP"
        isHovered={false}
        isSelected={false}
        onHover={noop}
        onSelect={noop}
      />,
    );

    const button = screen.getByRole("button", {
      name: /Bright loft\. Entire home in Centre\. £120 per night\. Open details\./i,
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
    // Room type label + neighbourhood are visible text, not colour-only.
    expect(screen.getByText("Entire home")).toBeInTheDocument();
    expect(screen.getByText("Centre")).toBeInTheDocument();
    expect(screen.getByText("£120")).toBeInTheDocument();
  });

  it("selects on click and reports hover on enter/leave", () => {
    const onSelect = vi.fn();
    const onHover = vi.fn();
    render(
      <ListingCard
        listing={makeListing({ id: 42 })}
        neighbourhoodName="Centre"
        currency="GBP"
        isHovered={false}
        isSelected={false}
        onHover={onHover}
        onSelect={onSelect}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(42);

    fireEvent.mouseEnter(button);
    expect(onHover).toHaveBeenLastCalledWith(42);
    fireEvent.mouseLeave(button);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("marks the selected row via aria-pressed", () => {
    render(
      <ListingCard
        listing={makeListing()}
        neighbourhoodName="Centre"
        currency="GBP"
        isHovered={false}
        isSelected
        onHover={noop}
        onSelect={noop}
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
