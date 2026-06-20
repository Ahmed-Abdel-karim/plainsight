import { act } from "@testing-library/react";

import { BrowsePanel, ListingDetail } from "@/features/scene/browse";
import { SystemId } from "@/features/scene/state/machines/constants";
import type { CityMachineActor } from "@/features/scene/state/machines/city/machine";
import type { UiMachineActor } from "@/features/scene/state/machines/ui/machine";
import type { RoomType } from "@/data/contract";
import type { MapCityPayload } from "@/data/types";
import { renderScene, type SceneRenderResult } from "@/test/render";

import { makeMapCityPayload } from "./data";

interface BrowseSetupOptions {
  framing?: Partial<MapCityPayload>;
  /** Stored filter seeded at spawn (before the city is `ready`). */
  filter?: {
    roomTypes?: RoomType[];
    priceRange?: [number, number] | null;
    nbhd?: string | null;
  };
}

export interface BrowseSetup extends SceneRenderResult {
  /** The city framing this scene navigates to. */
  framing: MapCityPayload;
  /** Act: the user navigates to the city (spawns it) with the Browse lens active. */
  navigateToCity: () => void;
  /** Act: the city's data finishes loading, so `FILTER.*` events apply. */
  finishCityLoad: () => void;
  /** The session ui actor (assert cross-actor state like hover/selection). */
  ui: UiMachineActor;
  /** The spawned city actor (present only after `navigateToCity`). */
  readonly city: CityMachineActor;
}

/**
 * Arrange only — render the browse surfaces over the real actor system in their
 * first-paint (city-less, loading) state, and return the acts (`navigateToCity`,
 * `finishCityLoad`) for the test to perform. No URL writes, no real worker.
 */
export function setupBrowse(options: BrowseSetupOptions = {}): BrowseSetup {
  const framing = makeMapCityPayload(options.framing);
  const filter = {
    roomTypes: [] as RoomType[],
    priceRange: null as [number, number] | null,
    nbhd: null as string | null,
    ...options.filter,
  };

  const result = renderScene(
    <>
      <BrowsePanel />
      <ListingDetail />
    </>,
  );

  const ui = result.root.system.get(SystemId.UI) as UiMachineActor;

  const navigateToCity = () => {
    act(() => {
      result.root.send({ type: "CITY.CHANGED", payload: framing, filter });
    });
    act(() => {
      ui.send({ type: "UI.SET_LENS", lens: "browse" });
    });
  };

  const finishCityLoad = () => {
    const city = result.root.system.get(SystemId.CITY) as CityMachineActor;
    act(() => {
      city.send({ type: "WORKER.FETCH_OK", slug: framing.slug, count: 3 });
    });
  };

  return {
    ...result,
    framing,
    navigateToCity,
    finishCityLoad,
    ui,
    get city() {
      return result.root.system.get(SystemId.CITY) as CityMachineActor;
    },
  };
}
