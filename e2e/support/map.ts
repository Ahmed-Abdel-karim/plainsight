import type { Page } from "@playwright/test";
import type { MapController, MapLocator } from "@mapgrab/playwright";

import {
  HEX_FILL_LAYER_ID,
  POINTS_CIRCLE_LAYER_ID,
  POINTS_SOURCE_ID,
} from "../../features/scene/map/constants";

// Re-export so specs assert against the same ids the app actually renders,
// rather than re-typing string literals that would silently drift on a rename.
export { HEX_FILL_LAYER_ID, POINTS_CIRCLE_LAYER_ID, POINTS_SOURCE_ID };

const MAIN_MAP_ID = "mainMap";

/**
 * Timeout for map-bound waits and polls. Real WebGL boot and the streaming
 * points source are far slower than jsdom, so map assertions need much longer
 * than the global `expect` timeout.
 */
export const MAP_TIMEOUT = 60_000;

type MapControllerFactory = (selector: string) => MapController;
type MapLocatorFactory = (selector: string) => MapLocator;

/**
 * The single-feature branch of a locator result — the merged shape has no
 * `properties`, so it's excluded. Derived from the public API because MapGrab
 * doesn't re-export its `SingleResult`/`ResultFeatureInterface` types.
 */
type SingleFeature = Extract<
  Awaited<ReturnType<MapLocator["getElement"]>>,
  { properties: unknown }
>;

/** A Browse points feature carrying the listing fields the specs read. */
export type PointFeature = Omit<SingleFeature, "featureId" | "properties"> & {
  featureId: number;
  properties: SingleFeature["properties"] & { id: number; name: string };
};

export const LONDON_HOTEL_CAMDEN_LISTING = {
  id: 31_486_927,
  name: "Private Quadruple Room in a Boutique Hostel",
  neighbourhoodId: "camden",
  priceRange: [100, 300] as const,
};

export function mainMap(mapController: MapControllerFactory): MapController {
  return mapController(MAIN_MAP_ID);
}

export function hexLayer(mapLocator: MapLocatorFactory): MapLocator {
  return mapLocator(`map[id=${MAIN_MAP_ID}] layer[id=${HEX_FILL_LAYER_ID}]`);
}

export function pointsLayer(mapLocator: MapLocatorFactory): MapLocator {
  return mapLocator(
    `map[id=${MAIN_MAP_ID}] layer[id=${POINTS_CIRCLE_LAYER_ID}]`,
  );
}

export function listingPoint(
  mapLocator: MapLocatorFactory,
  listingId: number,
): MapLocator {
  return mapLocator(
    `map[id=${MAIN_MAP_ID}] layer[id=${POINTS_CIRCLE_LAYER_ID}] filter["==", ["get", "id"], ${listingId}]`,
  );
}

export async function waitForMapReady(
  controller: MapController,
): Promise<void> {
  await controller.waitToMapLoaded({ timeout: MAP_TIMEOUT });
  await controller.waitToMapStable({ timeout: MAP_TIMEOUT });
}

export async function getMapSnapshot(controller: MapController): Promise<{
  center: { lng: number; lat: number };
  zoom: number;
  styleName: string | undefined;
}> {
  const handle = await controller.getMapInstance();
  return handle.evaluate((map) => {
    const center = map.getCenter();
    return {
      center: { lng: center.lng, lat: center.lat },
      zoom: map.getZoom(),
      styleName: map.getStyle()?.name,
    };
  });
}

export async function getFeatureState(
  controller: MapController,
  listingId: number,
): Promise<Record<string, unknown>> {
  const handle = await controller.getMapInstance();
  return handle.evaluate(
    (map, args) => map.getFeatureState({ source: args.source, id: args.id }),
    { source: POINTS_SOURCE_ID, id: listingId },
  );
}

export async function getLayerVisibility(
  controller: MapController,
  layerId: string,
): Promise<string> {
  const handle = await controller.getMapInstance();
  return handle.evaluate(
    (map, id) => map.getLayoutProperty(id, "visibility") ?? "visible",
    layerId,
  );
}

/**
 * Count the *distinct* point features the layer currently renders. Raw query
 * results double-count features that span tile boundaries and grow as the
 * source streams in, so dedupe by feature id for a stable, meaningful number.
 */
export async function distinctPointCount(page: Page): Promise<number> {
  return page.evaluate(
    ({ mapId, layerId }) => {
      const features =
        window.__MAPGRAB__?.query(`map[id=${mapId}] layer[id=${layerId}]`) ??
        [];
      return new Set(features.map((feature) => feature.featureId)).size;
    },
    { mapId: MAIN_MAP_ID, layerId: POINTS_CIRCLE_LAYER_ID },
  );
}

export async function firstFeature(locator: MapLocator): Promise<PointFeature> {
  const feature = await locator.first().getElement();
  if (
    !("properties" in feature) ||
    typeof feature.featureId !== "number" ||
    typeof feature.properties.id !== "number" ||
    typeof feature.properties.name !== "string"
  ) {
    throw new Error("Expected a point feature with a numeric id and name.");
  }
  return feature as PointFeature;
}

const ROOM_LABELS = ["Entire", "Private", "Shared", "Hotel"] as const;
type RoomLabel = (typeof ROOM_LABELS)[number];

/** Click a control by its exact accessible name (room toggles, zoom, etc.). */
export async function clickToggle(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${name}$`) }).click();
}

/**
 * Narrow the room filter to a single type. The toggle group expands "all rooms"
 * (`rooms=[]`) to *every* toggle pressed, so picking one type means clearing
 * back to all and then deselecting the others. Reset is disabled at the default
 * view, hence the enabled guard.
 */
export async function filterToRoomOnly(
  page: Page,
  room: RoomLabel,
): Promise<void> {
  const reset = page.getByRole("button", { name: "Reset" });
  if (await reset.isEnabled()) await reset.click();
  for (const label of ROOM_LABELS) {
    if (label !== room) await clickToggle(page, label);
  }
}
