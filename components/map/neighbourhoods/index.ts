/**
 * Neighbourhoods map domain. Anchored by a single GeoJSON `<Source>` and the
 * layers that read it (outline today; fill/label later), plus their theme→paint
 * mapping. Data arrives as a prop — fetching stays in `data/`.
 *
 * Convention for new sources (listings, …): one folder, one `<Source>`, its
 * layers, and a single composable `<…Layers>` component the canvas drops in.
 */
export { NeighbourhoodsLayers } from "./neighbourhoods-layers";
