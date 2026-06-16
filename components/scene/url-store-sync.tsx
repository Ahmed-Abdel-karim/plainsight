"use client";

/**
 * Seeds the scene stores from the URL **once**, on first mount — the read side
 * of the URL sync (its write-side twin is the `url-sync` coordinator). The stores
 * decouple scene state from `useSearchParams` (no dynamic/Suspense bailout), so
 * they can't read the query reactively; this reflects it in client-side instead:
 *
 *   - A deep-linked / refreshed `?lens=…&listing=…&nbhd=…&rooms=…&price=…` restores
 *     the shared link. The static shell paints the default view first, so a deep
 *     link settles one frame after hydration — `<Activity>` keeps both lens
 *     subtrees mounted, so it's a cheap flip.
 *
 * It seeds **only the first city of the session**, guarded by a ref. This
 * component lives under the `[city]` segment, which Next preserves across
 * param-only navigation (no remount, so the ref survives), and our own
 * `replaceState` writes never change the pathname. Subsequent city changes are
 * owned by the `fan-out` coordinator (reset city-bound fields, persist
 * lens/room-types) — not a URL re-seed — so this no longer reads the pathname.
 *
 * Renders nothing.
 */
import { useEffect, useRef } from "react";

import { loadScene } from "@/lib/search-params";
import {
  useCitySend,
  useSeedCityFilter,
  useSelectListing,
  useSetLens,
} from "./state";

export function UrlStoreSync() {
  const seeded = useRef(false);
  // `citySend` is undefined before the first CITY.CHANGED dispatch. It is added
  // as an effect dep so the effect re-triggers once the city actor spawns — at
  // which point `seeded.current` is still false and seeding fires exactly once.
  const citySend = useCitySend();
  const seedCityFilter = useSeedCityFilter();
  const setLens = useSetLens();
  const selectListing = useSelectListing();

  useEffect(() => {
    if (seeded.current || !citySend) return;
    seeded.current = true;

    const { lens, listing, nbhd, rooms, price } = loadScene(
      window.location.search,
    );
    // The URL state lives across two systems; seed each. `UI.SELECT` runs last so
    // it wins over the lens→clear reaction for a `?lens=browse` deep link.
    seedCityFilter({
      roomTypes: rooms,
      priceRange: price && price.length === 2 ? [price[0], price[1]] : null,
      nbhd,
    });
    setLens(lens);
    selectListing(listing);
  }, [citySend, seedCityFilter, setLens, selectListing]);

  return null;
}
