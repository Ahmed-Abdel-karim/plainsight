"use client";

import { use, useEffect } from "react";

import type { MapCityPayload } from "@/data/types";
import { loadScene } from "@/lib/search-params";

import { useChangeCity, useSelectListing, useSyncLens } from "./state";

/**
 * Client island that fires CITY.CHANGED into the XState root machine as soon as
 * the city framing resolves, and the single URL → state seeding point. Rendered
 * inside SceneProvider so it shares the same actor system. React deduplicates
 * the city promise resolution, and the city route remounts this component per
 * slug, so the effect fires exactly once per city.
 *
 * The deep-link is read here, once. The write side (`UrlWriteSync` → the root
 * `syncUrl` action) no-ops until a city exists, so the URL is still intact at
 * this point — no ref/snapshot workaround is needed to preserve it.
 */
export function SceneUrlLoader({
  cityPromise,
}: {
  cityPromise: Promise<MapCityPayload>;
}) {
  const city = use(cityPromise);
  const changeCity = useChangeCity();
  const syncLens = useSyncLens();
  const selectListing = useSelectListing();

  useEffect(() => {
    const { lens, listing, rooms, price, nbhd } = loadScene(
      typeof window === "undefined" ? "" : window.location.search,
    );
    // The URL is authoritative for lens. Its value reflects the destination on a
    // cold load, a forward city switch (the CityLink carries the lens), or a
    // Back/Forward restore. Lens must land on the session `ui` actor BEFORE the
    // city is spawned, because the city reads it at spawn (`deciding`) to pick
    // its leg — so sync it, then change city. UI.SYNC_LENS applies even while
    // `ui` is suspended mid-switch (unlike UI.SET_LENS), so the restore isn't
    // dropped.
    syncLens(lens);
    // Filter rides into the city machine's input so the spawned actor is already
    // filtered when it reaches `ready` — a post-spawn FILTER event would be
    // dropped against `loading`. (On a city switch the URL is the clean new-city
    // path, so this seeds defaults — the per-city filter reset.)
    changeCity(city, {
      roomTypes: rooms,
      priceRange: price && price.length === 2 ? [price[0], price[1]] : null,
      nbhd,
    });
    // Selection lives on `ui` too. SELECT after the lens sync so a
    // `?lens=browse&listing=…` deep link keeps its listing (switching to
    // `analyse` clears selection; browse does not).
    selectListing(lens === "browse" ? listing : null);
  }, [city, changeCity, syncLens, selectListing]);

  return null;
}
