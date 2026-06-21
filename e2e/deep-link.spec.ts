import { expect, test } from "./support";
import {
  LONDON_HOTEL_CAMDEN_LISTING,
  MAP_TIMEOUT,
  getFeatureState,
  getMapSnapshot,
  listingPoint,
  mainMap,
  pointsLayer,
  waitForMapReady,
} from "./support/map";

test("cold Browse deep link does not load Analyse analytics", async ({
  page,
}) => {
  const analyticsRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/london\/[^/]+\/analytics\.json$/.test(request.url())) {
      analyticsRequests.push(request.url());
    }
  });

  const pointsLoaded = page.waitForResponse(
    (response) =>
      /\/london\/[^/]+\/points\.geojson$/.test(response.url()) && response.ok(),
  );
  await page.goto("/london?lens=browse");
  await expect(page.getByRole("radio", { name: "Browse" })).toBeChecked();
  await pointsLoaded;

  expect(analyticsRequests).toEqual([]);
});

test("cold deep-link restore and basemap theme swap", async ({
  page,
  mapController,
  mapLocator,
}) => {
  const map = mainMap(mapController);
  const styleRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("tiles.openfreemap.org/styles/")) {
      styleRequests.push(url);
    }
  });

  await test.step("restore a cold Browse deep link", async () => {
    const params = new URLSearchParams({
      lens: "browse",
      nbhd: LONDON_HOTEL_CAMDEN_LISTING.neighbourhoodId,
      price: LONDON_HOTEL_CAMDEN_LISTING.priceRange.join(","),
      listing: String(LONDON_HOTEL_CAMDEN_LISTING.id),
    });
    await page.goto(`/london?${params}`);
    await waitForMapReady(map);
    await expect(pointsLayer(mapLocator)).toBeVisibleOnMap({
      timeout: MAP_TIMEOUT,
    });
    await expect(
      listingPoint(mapLocator, LONDON_HOTEL_CAMDEN_LISTING.id),
    ).toBeVisibleOnMap({ timeout: MAP_TIMEOUT });
    await expect(
      page.getByRole("heading", {
        name: LONDON_HOTEL_CAMDEN_LISTING.name,
      }),
    ).toBeVisible();
    await expect
      .poll(async () => getFeatureState(map, LONDON_HOTEL_CAMDEN_LISTING.id), {
        timeout: MAP_TIMEOUT,
      })
      .toMatchObject({ selected: true });
  });

  await test.step("swap the basemap style in place", async () => {
    expect(styleRequests.some((url) => url.includes("/styles/dark"))).toBe(
      true,
    );

    await page.getByRole("button", { name: "Close listing details" }).click();
    await map.waitToMapStable({ timeout: MAP_TIMEOUT });
    const before = await getMapSnapshot(map);

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await map.waitToMapLoaded({ timeout: MAP_TIMEOUT });
    await map.waitToMapStable({ timeout: MAP_TIMEOUT });

    await expect
      .poll(
        () => styleRequests.some((url) => url.includes("/styles/positron")),
        { timeout: MAP_TIMEOUT },
      )
      .toBe(true);

    const after = await getMapSnapshot(map);
    expect(after.center.lng).toBeCloseTo(before.center.lng, 2);
    expect(after.center.lat).toBeCloseTo(before.center.lat, 2);
    await expect(page).toHaveURL(/\/london\?/);
    await expect(
      page.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeVisible();
  });
});
