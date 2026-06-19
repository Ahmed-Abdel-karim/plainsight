import { screen, within } from "@/test/render";

// Region-local custom queries for the scene composition. The map layers/sources
// are the Principle-2 render-boundary mock: it re-emits the data it was handed as
// `data-*`, which we assert on as a proxy for "the map rendered it".

/** The browse listings list, once it has rendered from the points tier. */
export const findListingList = () =>
  screen.findByRole("list", { name: /listings matching/i });

/** A mocked map layer by id, exposing `data-layer-visibility` / `data-layer-filter`. */
export const getMapLayer = (id: string) =>
  screen.getByTestId(`map-layer-${id}`);

export const findMapLayer = (id: string) =>
  screen.findByTestId(`map-layer-${id}`);

export const queryMapLayer = (id: string) =>
  screen.queryByTestId(`map-layer-${id}`);

/** A mocked map source by id, exposing `data-feature-count`. */
export const getMapSource = (id: string) =>
  screen.getByTestId(`map-source-${id}`);

export { within };
