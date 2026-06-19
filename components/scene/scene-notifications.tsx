"use client";

import { useEffect } from "react";

import { notifyError } from "@/lib/toast";
import { useCityRef } from "./state/machines/city/use-city";

const PROCESS_DESCRIPTION = {
  hexes: "The map view may be out of date.",
  aggregates: "The market stats may be out of date.",
} as const;

/**
 * Turns the city machine's emitted `city.error` signals into toasts. Renders
 * nothing; mounted once inside the scene provider. Re-subscribes when the city
 * actor is respawned on navigation. Keeping the copy here (not in the machine)
 * is the UI/state boundary: the machine emits *what failed*, this decides *how
 * to tell the user*.
 */
export function SceneNotifications() {
  const cityRef = useCityRef();

  useEffect(() => {
    if (!cityRef) return;
    const sub = cityRef.on("city.error", (event) => {
      if (event.kind === "load") {
        notifyError(
          "city-load",
          "Couldn't load this city",
          "Some data is unavailable. Try reloading the page.",
        );
        return;
      }
      notifyError(
        "city-compute",
        "Couldn't update the view",
        event.processType ? PROCESS_DESCRIPTION[event.processType] : undefined,
      );
    });
    return () => sub.unsubscribe();
  }, [cityRef]);

  return null;
}
