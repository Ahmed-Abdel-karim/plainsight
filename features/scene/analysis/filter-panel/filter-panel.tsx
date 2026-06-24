"use client";

import { CityMeta, type RoomType } from "@/data/contract";
import { expandRoomTypes } from "@/lib/filters/normalize";
import { useCityFraming, useFilterControls } from "../../state";
import { FilterPanelUi } from "./filter-panel-ui";

/**
 * Filter panel. Owns its filter ↔ URL state directly via `useFilterControls` (shared
 * with the Analyse cards + Browse list through the nuqs URL params, not props),
 * so it renders once above both tabs and stays in sync with them. Every control —
 * room-type toggles and the price slider — drives the city machine directly; the
 * machine is the single source of truth and coalesces a price drag into one worker
 * recompute, so the panel holds no local filter copy. An empty room selection
 * means "all".
 *
 * Only the static, server-derived `bounds` + `currency` come in as props (threaded
 * from the page's cached meta read); everything filter-shaped lives here.
 */
export function FilterPanel({ cityMeta }: { cityMeta: CityMeta }) {
  const city = useCityFraming() ?? cityMeta;
  const currency = city?.currency ?? "";
  const { filters, bounds, isDefault, setRoomTypes, setPriceRange, reset } =
    useFilterControls();

  // Empty selection is the "all room types" state — show every toggle as active.
  const selectedRooms = expandRoomTypes(filters.roomTypes);

  return (
    <FilterPanelUi
      bounds={bounds}
      currency={currency}
      onPriceChange={(value) => setPriceRange(value as [number, number])}
      onRoomChange={(value) => setRoomTypes(value as RoomType[])}
      priceRange={filters.priceRange}
      selectedRooms={selectedRooms}
      reset={reset}
      disabled={isDefault}
    />
  );
}
