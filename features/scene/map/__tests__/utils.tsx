import { act } from "@testing-library/react";

import { MapLegend } from "@/features/scene/map-legend";
import { MarketHeader } from "@/features/scene/market-header";
import { SystemId } from "@/features/scene/state/machines/constants";
import type { CityMachineActor } from "@/features/scene/state/machines/city/machine";
import type { MapMachineActor } from "@/features/scene/state/machines/map/machine";
import type { UiMachineActor } from "@/features/scene/state/machines/ui/machine";
import type { Lens } from "@/lib/search-params";
import type { MapCityPayload } from "@/data/types";
import type { FakeMaplibreMap } from "@/test/scene/fake-map";
import { renderScene, type SceneRenderResult } from "@/test/render";

import { MapCanvas } from "../map-canvas";
import { makeMapCityPayload } from "./data";

interface MapSetupOptions {
  framing?: Partial<MapCityPayload>;
  /** Listing count shown in the (prop-driven) market header. */
  listingCount?: number;
}

export interface MapSetup extends SceneRenderResult {
  framing: MapCityPayload;
  /** Act: navigate to the city — spawns it and lets the canvas mount + load. */
  navigateToCity: () => void;
  /** Act: switch the active lens (default is `analyse`). */
  setLens: (lens: Lens) => void;
  /** Act: begin a city switch (NAV.STARTED → root fans SUSPEND, suppressing the map). */
  startCitySwitch: (slug?: string) => void;
  /** Act: the incoming city converged (CITY.READY → root fans RESUME). */
  finishCitySwitch: () => void;
  /** The spied MapLibre instance the machine drives, once the canvas has mounted. */
  getMapInstance: () => FakeMaplibreMap | undefined;
  ui: UiMachineActor;
  readonly map: MapMachineActor;
  readonly city: CityMachineActor;
}

/**
 * Arrange only — render the map surfaces (canvas + market header + legend) over the
 * real actor system in their first-paint (city-less) state, returning the acts for
 * the test to perform. react-map-gl is mocked at the render boundary by the test file.
 */
export function setupMap(options: MapSetupOptions = {}): MapSetup {
  const framing = makeMapCityPayload(options.framing);
  const listingCount = options.listingCount ?? 1000;

  const result = renderScene(
    <>
      <MarketHeader
        cityName={framing.cityName}
        listingCount={listingCount}
        snapshotLabel={framing.snapshotLabel}
      />
      <MapCanvas />
      <MapLegend />
    </>,
  );

  const ui = result.root.system.get(SystemId.UI) as UiMachineActor;
  const getMap = () => result.root.system.get(SystemId.MAP) as MapMachineActor;

  const navigateToCity = () => {
    act(() => {
      result.root.send({
        type: "CITY.CHANGED",
        payload: framing,
        filter: { roomTypes: [], priceRange: null, nbhd: null },
      });
    });
  };

  const setLens = (lens: Lens) => {
    act(() => {
      ui.send({ type: "UI.SET_LENS", lens });
    });
  };

  const startCitySwitch = (slug = "berlin") => {
    act(() => {
      result.root.send({ type: "NAV.STARTED", path: `/${slug}` });
    });
  };

  const finishCitySwitch = () => {
    act(() => {
      result.root.send({ type: "CITY.READY" });
    });
  };

  const getMapInstance = () =>
    getMap().getSnapshot().context.mapRef?.getMap() as
      | FakeMaplibreMap
      | undefined;

  return {
    ...result,
    framing,
    navigateToCity,
    setLens,
    startCitySwitch,
    finishCitySwitch,
    getMapInstance,
    ui,
    get map() {
      return getMap();
    },
    get city() {
      return result.root.system.get(SystemId.CITY) as CityMachineActor;
    },
  };
}
