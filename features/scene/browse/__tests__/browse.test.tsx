import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

// next/image → plain <img> for jsdom (list cover + detail gallery).
vi.mock("next/image", () => import("@/test/mocks/next-image"));

import { screen, waitFor } from "@/test/render";

import {
  findDetailDrawer,
  findListingButton,
  findListingList,
  getBrowseCount,
  getLoadingIndicator,
  getSortControl,
  queryListingList,
  queryLoadingIndicator,
  within,
} from "./queries";
import { setupBrowse } from "./utils";

/**
 * Browse region integration test. Radix Select reorder and the map-dot pointer
 * path are the only browse behaviours that need a real browser, so they live in
 * E2E, not here.
 */
describe("browse region", () => {
  it("shows an accessible loading state, then the listings with a live count", async () => {
    const scene = setupBrowse();

    const loading = getLoadingIndicator();
    expect(loading).toHaveAttribute("role", "status");
    expect(loading).toHaveAttribute("aria-busy", "true");

    scene.navigateToCity();

    const list = await findListingList();
    expect(queryLoadingIndicator()).toBeNull();
    expect(within(list).getAllByRole("button")).toHaveLength(3);
    const count = getBrowseCount();
    expect(count).toHaveAttribute("aria-live", "polite");
    expect(count).toHaveTextContent("3 of 3 listings");
    expect(await axe(list)).toHaveNoViolations();
  });

  it("renders each row as a pressable button named by room, neighbourhood and price", async () => {
    const scene = setupBrowse();
    scene.navigateToCity();

    // Name resolves "Centre" from the boundaries tier, not the raw "centre" id.
    const card = await findListingButton(
      /Bright loft\. Entire home in Centre\. £120 per night\. Open details\./i,
    );
    expect(card).toHaveAttribute("aria-pressed", "false");

    // Room type carried by label + neighbourhood, never colour alone (CR-003).
    expect(within(card).getByText("Entire home")).toBeInTheDocument();
    expect(within(card).getByText("Centre")).toBeInTheDocument();
    expect(within(card).getByText("£120")).toBeInTheDocument();
  });

  it("reports a list-row hover to the shared ui state", async () => {
    const scene = setupBrowse();
    scene.navigateToCity();

    const card = await findListingButton(/Bright loft/i);
    await scene.user.hover(card);
    expect(scene.ui.getSnapshot().context.hoveredListingId).toBe(42);

    await scene.user.unhover(card);
    expect(scene.ui.getSnapshot().context.hoveredListingId).toBeNull();
  });

  it.each([
    {
      name: /Bright loft/i,
      id: 42,
      host: "Ada",
      multiHost: true,
      reviews: "1.4",
      reviewCount: "57",
      minNights: "3",
    },
    {
      name: /Cosy room/i,
      id: 7,
      host: "Bo",
      multiHost: false,
      reviews: "—",
      reviewCount: "4",
      minNights: "1",
    },
  ])(
    "opens the detail drawer for $host with host/reviews/provenance and never availability",
    async ({ name, id, host, multiHost, reviews, reviewCount, minNights }) => {
      const scene = setupBrowse();
      scene.navigateToCity();

      const card = await findListingButton(name);
      await scene.user.click(card);
      expect(card).toHaveAttribute("aria-pressed", "true");

      const drawer = await findDetailDrawer();
      const detail = within(drawer);
      expect(detail.getByText(host)).toBeInTheDocument();
      expect(detail.getByText("Reviews / month")).toBeInTheDocument();
      expect(detail.getByText(reviews)).toBeInTheDocument();
      expect(detail.getByText("Review count")).toBeInTheDocument();
      expect(detail.getByText(reviewCount)).toBeInTheDocument();
      expect(detail.getByText("Minimum nights")).toBeInTheDocument();
      expect(detail.getByText(minNights)).toBeInTheDocument();

      const badge = detail.queryByLabelText("Host has two or more listings");
      expect(badge?.textContent ?? null).toBe(multiHost ? "2+" : null);

      // D3: availability is not in the dataset and must never be shown.
      expect(
        detail.getByText(
          (content) =>
            content.includes(`Listing #${id}`) &&
            content.includes("Inside Airbnb") &&
            content.includes("9/2025 snapshot"),
        ),
      ).toBeInTheDocument();
      expect(detail.queryByText(/availability|\b365\b/i)).toBeNull();
    },
  );

  // The row is a native <button>, so the keyboard opens the drawer the same way a
  // click does. Focus-trap/focus-return across the portal is a real-browser
  // concern (jsdom doesn't run vaul's FocusScope), so it lives in E2E, not here.
  it.each(["{Enter}", "[Space]"])(
    "opens the detail drawer when a row is activated with %s",
    async (key) => {
      const scene = setupBrowse();
      scene.navigateToCity();

      const card = await findListingButton(/Bright loft/i);
      card.focus();
      await scene.user.keyboard(key);

      expect(card).toHaveAttribute("aria-pressed", "true");
      expect(await findDetailDrawer()).toBeInTheDocument();
    },
  );

  it("clears the selection when the detail drawer is dismissed with Escape", async () => {
    const scene = setupBrowse();
    scene.navigateToCity();

    const card = await findListingButton(/Bright loft/i);
    await scene.user.click(card);
    await findDetailDrawer();

    await scene.user.keyboard("{Escape}");
    // vaul keeps the closed node mounted in jsdom (no animation-end to unmount),
    // so assert the user-visible effect: the row is no longer pressed.
    await waitFor(() => expect(card).toHaveAttribute("aria-pressed", "false"));
  });

  it("has no axe violations with the detail drawer open", async () => {
    const scene = setupBrowse();
    scene.navigateToCity();

    const card = await findListingButton(/Bright loft/i);
    await scene.user.click(card);
    await findDetailDrawer();

    expect(await axe(scene.container)).toHaveNoViolations();
  });

  it("shows the Sort control reflecting the default option", async () => {
    const scene = setupBrowse();
    scene.navigateToCity();
    await findListingList();

    // Reflects the selected key; the actual reorder needs Radix pointer APIs
    // jsdom lacks, so it is proven in E2E.
    expect(getSortControl()).toHaveTextContent("Price: low to high");
  });

  it("shows the empty state when filters exclude every row, and reset restores the list", async () => {
    const scene = setupBrowse({ filter: { priceRange: [10, 30] } });

    scene.navigateToCity();
    scene.finishCityLoad(); // reset's FILTER.* only applies once the city is ready

    expect(
      await screen.findByText("No listings match the current filters."),
    ).toBeInTheDocument();
    expect(queryListingList()).toBeNull();

    await scene.user.click(
      screen.getByRole("button", { name: "Reset filters" }),
    );

    const list = await findListingList();
    expect(within(list).getAllByRole("button")).toHaveLength(3);
  });

  it("has no axe violations", async () => {
    const scene = setupBrowse();
    scene.navigateToCity();
    await findListingList();

    expect(await axe(scene.container)).toHaveNoViolations();
  });
});
