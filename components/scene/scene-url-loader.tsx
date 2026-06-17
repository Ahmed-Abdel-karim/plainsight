"use client";

import { use, useEffect } from "react";

import type { MapCityPayload } from "@/data/types";
import { loadScene } from "@/lib/search-params";

import { useChangeCity, useSelectListing, useSetLens } from "./state";

/**
 * Client island that fires CITY.CHANGED into the XState root machine as soon as
 * the city framing resolves, and the single URL → state seeding point. Rendered
 * inside CityStoreProvider so it shares the same promise instance (React
 * deduplicates the resolution). key={slug} at the CityStoreProvider call site
 * remounts this component per city, so the effect fires exactly once per slug.
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
  const setLens = useSetLens();
  const selectListing = useSelectListing();

  useEffect(() => {
    const { lens, listing, rooms, price, nbhd } = loadScene(
      typeof window === "undefined" ? "" : window.location.search,
    );
    // Filter rides into the city machine's input so the spawned actor is already
    // filtered when it reaches `ready` — a post-spawn FILTER event would be
    // dropped against `loading`. (On a city switch the URL is the clean new-city
    // path, so this seeds defaults — the per-city filter reset.)
    console.log(city.cityName);
    changeCity(city, {
      roomTypes: rooms,
      priceRange: price && price.length === 2 ? [price[0], price[1]] : null,
      nbhd,
    });
    // Lens + selection live on the session `ui` actor. On first load it's
    // `active` and accepts these; on a city switch it's `navigating` and drops
    // them (selection clears, lens persists) — exactly the desired behaviour.
    // SELECT after SET_LENS so a `?lens=browse&listing=…` deep link keeps its
    // listing (switching to `analyse` clears selection; browse does not).
    setLens(lens);
    selectListing(listing);
  }, [city, changeCity, setLens, selectListing]);

  return null;
}
