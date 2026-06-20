import { screen, within } from "@/test/render";

// Region-local custom queries. The map surfaces are role/name-first; the mocked
// MapLibre layers/sources are the sanctioned Principle-2 exception — the
// render-boundary mock re-emits the data it was handed as `data-*`, and we assert
// on that as a proxy for "the map rendered it".

/** The labelled map region, present once a city is framed. */
export const getMapRegion = (cityName: string = "") =>
  screen.getByRole("region", { name: new RegExp(`map of ${cityName}`, "i") });

export const queryMapRegion = (cityName: string = "") =>
  screen.queryByRole("region", { name: new RegExp(`map of ${cityName}`, "i") });

/** The no-city loading skeleton, or `null` once a city exists. Queried by its
 * announced text — a `status` region takes no accessible name from its content. */
export const queryMapSkeleton = () => screen.queryByText(/loading map/i);

export const getMapSkeleton = () => screen.getByText(/loading map/i);

/** The city-switch suppression overlay, by the city it is loading. */
export const getLoadingOverlay = (cityName: string) =>
  screen.getByRole("status", { name: new RegExp(`loading ${cityName}`, "i") });

export const queryLoadingOverlay = (cityName: string) =>
  screen.queryByRole("status", {
    name: new RegExp(`loading ${cityName}`, "i"),
  });

/** The folded map legend (neighbourhood count). */
export const getMapLegend = () =>
  screen.getByRole("complementary", { name: "Map legend" });

/** The folded market header. */
export const getMarketHeader = () => screen.getByRole("banner");

/** A mocked map source by id, exposing `data-feature-count` etc. */
export const getMapSource = (id: string) =>
  screen.getByTestId(`map-source-${id}`);

/** A mocked map layer by id, exposing `data-layer-visibility` / `data-layer-filter`. */
export const getMapLayer = (id: string) =>
  screen.getByTestId(`map-layer-${id}`);

export const queryMapLayer = (id: string) =>
  screen.queryByTestId(`map-layer-${id}`);

export { within };
