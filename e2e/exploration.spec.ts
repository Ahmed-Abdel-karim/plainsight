import type { Page } from "@playwright/test";

import { expect, test } from "./support";
import {
  HEX_FILL_LAYER_ID,
  MAP_TIMEOUT,
  POINTS_CIRCLE_LAYER_ID,
  clickToggle,
  distinctPointCount,
  filterToRoomOnly,
  firstFeature,
  getFeatureState,
  getLayerVisibility,
  getMapSnapshot,
  hexLayer,
  mainMap,
  pointsLayer,
  waitForMapReady,
} from "./support/map";

/** Parse the `… £1,234 per night …` figure out of a listing card's label. */
function priceFromLabel(label: string | null): number {
  const match = label?.match(/([\d,]+)\s*per night/);
  return match ? Number(match[1].replace(/,/g, "")) : NaN;
}

async function firstTwoListingPrices(page: Page): Promise<[number, number]> {
  const cards = page
    .getByRole("list", { name: /listings matching/i })
    .getByRole("button");
  return [
    priceFromLabel(await cards.nth(0).getAttribute("aria-label")),
    priceFromLabel(await cards.nth(1).getAttribute("aria-label")),
  ];
}

test("exploration journey exercises real map rendering and pointer hits", async ({
  page,
  mapController,
  mapLocator,
}) => {
  const map = mainMap(mapController);
  const hexes = hexLayer(mapLocator);
  const points = pointsLayer(mapLocator);

  await test.step("open the city selector and pick London", async () => {
    await page.goto("/");
    await page.getByRole("link", { name: /london, united kingdom/i }).click();
    await expect(page).toHaveURL(/\/london$/);
    await expect(
      page.getByRole("region", { name: /map of london/i }),
    ).toBeVisible();
    await waitForMapReady(map);
    await expect(hexes).toBeVisibleOnMap({ timeout: MAP_TIMEOUT });
  });

  await test.step("change a filter in the Analyse lens", async () => {
    const before = await hexes.count();
    await clickToggle(page, "Entire");
    await map.waitToMapRepaint({ timeout: MAP_TIMEOUT });
    await expect
      .poll(() => hexes.count(), { timeout: MAP_TIMEOUT })
      .not.toBe(before);
  });

  await test.step("zoom in and observe hex re-render", async () => {
    const before = await hexes.count();
    await page.getByRole("button", { name: /zoom in/i }).click();
    await map.waitToMapRepaint({ timeout: MAP_TIMEOUT });
    // Zoom-in re-renders the hex layer at a new H3 resolution. The rendered
    // count isn't monotonic (a smaller viewport offsets the finer resolution),
    // so assert only that the layer changed, not a direction.
    await expect
      .poll(() => hexes.count(), { timeout: MAP_TIMEOUT })
      .not.toBe(before);
  });

  await test.step("hover a real hex feature and show the price popup", async () => {
    await hexes.first().click();
    await expect(page.locator(".hex-inspect-popup")).toContainText(/Median/);
    await expect(page.locator(".hex-inspect-popup")).toContainText(/Listings/);
  });

  await test.step("switch to Browse and swap map interactivity", async () => {
    await page.getByRole("radio", { name: "Browse" }).click();
    await waitForMapReady(map);
    await expect(points).toBeVisibleOnMap({ timeout: MAP_TIMEOUT });
    await expect(hexes).toBeHiddenOnMap({ timeout: MAP_TIMEOUT });
    await expect(await getLayerVisibility(map, POINTS_CIRCLE_LAYER_ID)).toBe(
      "visible",
    );
    await expect(await getLayerVisibility(map, HEX_FILL_LAYER_ID)).toBe("none");
  });

  await test.step("filter Browse to Hotel room points", async () => {
    await map.waitToMapStable({ timeout: MAP_TIMEOUT });
    const before = await distinctPointCount(page);
    await filterToRoomOnly(page, "Hotel");
    await map.waitToMapRepaint({ timeout: MAP_TIMEOUT });
    await expect
      .poll(() => distinctPointCount(page), { timeout: MAP_TIMEOUT })
      .toBeLessThan(before);
  });

  await test.step("sort reorders the listing list in the DOM", async () => {
    const sort = page.getByRole("combobox", { name: "Sort" });

    await sort.click();
    await page.getByRole("option", { name: "Price: high to low" }).click();
    await expect
      .poll(async () => {
        const [first, second] = await firstTwoListingPrices(page);
        return first >= second;
      })
      .toBe(true);

    await sort.click();
    await page.getByRole("option", { name: "Price: low to high" }).click();
    await expect
      .poll(async () => {
        const [first, second] = await firstTwoListingPrices(page);
        return first <= second;
      })
      .toBe(true);
  });

  await test.step("select a listing through a real map point", async () => {
    const target = await firstFeature(points);
    await points.first().click();
    await expect(page).toHaveURL(new RegExp(`[?&]listing=${target.featureId}`));
    await expect(
      page.getByRole("heading", { name: target.properties.name }),
    ).toBeVisible();
    await expect
      .poll(async () => getFeatureState(map, target.featureId), {
        timeout: MAP_TIMEOUT,
      })
      .toMatchObject({ selected: true });
  });

  await test.step("map stayed live after the journey", async () => {
    const snapshot = await getMapSnapshot(map);
    expect(snapshot.zoom).toBeGreaterThan(0);
  });
});
