"use client";

import { useState } from "react";
import { CityMeta, type RoomType } from "@/data/contract";
import { expandRoomTypes } from "@/lib/filters/normalize";
import { useDebouncedCallback } from "use-debounce";
import { useCityFraming, useFilterControls } from "../../state";
import { FilterPanelUi } from "./filter-panel-ui";

const PRICE_COMMIT_MS = 250;

/**
 * Filter panel. Owns its filter ↔ URL state directly via `useFilterControls` (shared
 * with the Analyse cards + Browse list through the nuqs URL params, not props),
 * so it renders once above both tabs and stays in sync with them. Room-type
 * toggles commit immediately (discrete); the price slider drags on instant local
 * state and commits the range after the drag settles (debounced), so the URL
 * write + worker recompute fire once. An empty room selection means "all".
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

  // Local draft for smooth dragging; the committed range lands in the URL.
  const [priceDraft, setPriceDraft] = useState<[number, number]>(
    filters.priceRange,
  );
  // Re-sync the draft when the committed range changes externally (reset, the
  // back button) — React's "adjust state during render" pattern, guarded by the
  // last range we synced from, so it runs only on an actual change.
  const [syncedRange, setSyncedRange] = useState(filters.priceRange);
  if (
    filters.priceRange[0] !== syncedRange[0] ||
    filters.priceRange[1] !== syncedRange[1]
  ) {
    setSyncedRange(filters.priceRange);
    setPriceDraft(filters.priceRange);
  }

  const commitPrice = useDebouncedCallback(setPriceRange, PRICE_COMMIT_MS);
  const onPriceChange = (value: number[]) => {
    const range = value as [number, number];
    setPriceDraft(range);
    commitPrice(range);
  };

  return (
    <FilterPanelUi
      bounds={bounds}
      currency={currency}
      onPriceChange={onPriceChange}
      onRoomChange={(value) => setRoomTypes(value as RoomType[])}
      priceRange={priceDraft}
      selectedRooms={selectedRooms}
      reset={reset}
      disabled={isDefault}
    />
  );
}
