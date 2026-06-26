import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { cityFixtures } from "@/test/fixtures/cities";
import { HomeView } from "./home-view";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

vi.mock("@/features/home/city-picker/city-images", () => ({
  cityImages: {
    london: "/cities/london.png",
    berlin: "/cities/berlin.png",
  },
}));

// `CityPicker` is the async server data boundary (unrenderable in jsdom); swap it
// for the real synchronous grid over fixtures so the one view test exercises the
// actual cards, not a stub.
vi.mock("@/features/home/city-picker/city-picker", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/home/city-picker/city-picker")
    >();
  const { cityFixtures } = await import("@/test/fixtures/cities");
  return {
    ...actual,
    CityPicker: () => <actual.CityPickerView cities={cityFixtures} />,
  };
});

/**
 * Landing view test — the future E2E entry point. Asserts the static framing copy,
 * the market grid, and accessibility in one render. "The page exists when loaded"
 * (the async data fetch) is the E2E concern.
 */
describe("landing view", () => {
  it("renders the framing shell: logo, headline, honest-data intro, and footer", () => {
    render(<HomeView />);

    expect(screen.getByText("Plainsight")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /where short-term rentals are, what they cost, and who controls the market/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/built on dated public inside airbnb snapshots/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/read-only.*inside airbnb data.*no sign-up/i),
    ).toBeInTheDocument();
  });

  it("renders a market card per city with its route link and details", () => {
    render(<HomeView />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Choose a market" }),
    ).toBeInTheDocument();

    for (const city of cityFixtures) {
      const snapshot = `${city.snapshotLabel} snapshot`;
      const cardLink = screen.getByRole("link", {
        name: `${city.name}, ${city.country}. ${city.frame}. ${city.listings}. ${snapshot}.`,
      });

      expect(cardLink).toHaveAttribute("href", `/${city.slug}`);
      expect(
        within(cardLink).getByRole("heading", { level: 3, name: city.name }),
      ).toBeInTheDocument();
      expect(cardLink).toHaveTextContent(city.country);
      expect(cardLink).toHaveTextContent(city.frame);
      expect(cardLink).toHaveTextContent(city.listings);
      expect(cardLink).toHaveTextContent(snapshot);
    }
  });

  it("has no axe violations", async () => {
    const { container } = render(<HomeView />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
