"use client";

import { use, useEffect } from "react";

import { useDispatchCityChanged } from "./state";
import type { MapCityPayload } from "@/data/types";

/**
 * Client island that fires CITY.CHANGED into the XState root machine as soon as
 * the city framing resolves. Rendered inside CityStoreProvider so it shares the
 * same promise instance (React deduplicates the resolution). key={slug} at the
 * CityStoreProvider call site remounts this component per city, so the effect
 * fires exactly once per slug.
 */
export function CityDispatcher({
  cityPromise,
}: {
  cityPromise: Promise<MapCityPayload>;
}) {
  const city = use(cityPromise);
  const dispatch = useDispatchCityChanged();

  useEffect(() => {
    dispatch(city);
  }, [city, dispatch]);

  return null;
}
