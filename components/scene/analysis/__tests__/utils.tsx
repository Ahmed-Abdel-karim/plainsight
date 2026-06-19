import { act } from "@testing-library/react";

import { SystemId } from "@/components/scene/state/machines/constants";
import type { CityMachineActor } from "@/components/scene/state/machines/city/machine";
import type { RoomType, ScopeAggregates } from "@/data/contract";
import type { MapCityPayload } from "@/data/types";
import { renderScene, type SceneRenderResult } from "@/test/render";

import { AnalysisCards } from "../analysis-cards";
import { makeMapCityPayload, makeRichAggregates } from "./data";

interface AnalysisSetupOptions {
  /** The server's pre-baked aggregates handed to `AnalysisCards`. */
  defaultAggregates?: ScopeAggregates;
  framing?: Partial<MapCityPayload>;
  /** Stored filter seeded at spawn — non-default drives the cold/filtered path. */
  filter?: {
    roomTypes?: RoomType[];
    priceRange?: [number, number] | null;
    nbhd?: string | null;
  };
}

export interface AnalysisSetup extends SceneRenderResult {
  framing: MapCityPayload;
  /** Act: the user navigates to the city (spawns it), loading. */
  navigateToCity: () => void;
  /** Act: the city's data finishes loading, so it converges to `ready`. */
  finishCityLoad: () => void;
  /** Act: the worker returns recomputed aggregates for the current scope. */
  replyAggregates: (data: ScopeAggregates) => void;
  /** Act: the user narrows the room-type filter (a non-default, recompute-triggering change). */
  setRoomTypes: (roomTypes: RoomType[]) => void;
  readonly city: CityMachineActor;
}

/**
 * Arrange only — render the analysis cards over the real actor system with the
 * server's `defaultAggregates`, and return the acts (`navigateToCity`,
 * `finishCityLoad`, `replyAggregates`, `setRoomTypes`) for the test to perform.
 */
export function setupAnalysis(
  options: AnalysisSetupOptions = {},
): AnalysisSetup {
  const framing = makeMapCityPayload(options.framing);
  const defaultAggregates = options.defaultAggregates ?? makeRichAggregates();
  const filter = {
    roomTypes: [] as RoomType[],
    priceRange: null as [number, number] | null,
    nbhd: null as string | null,
    ...options.filter,
  };

  const result = renderScene(
    <AnalysisCards currency="GBP" defaultAggregates={defaultAggregates} />,
  );

  const getCity = () =>
    result.root.system.get(SystemId.CITY) as CityMachineActor;

  const navigateToCity = () => {
    act(() => {
      result.root.send({ type: "CITY.CHANGED", payload: framing, filter });
    });
  };

  const finishCityLoad = () => {
    act(() => {
      getCity().send({ type: "WORKER.FETCH_OK", slug: framing.slug, count: 3 });
    });
  };

  const replyAggregates = (data: ScopeAggregates) => {
    act(() => {
      result.transport.reply({
        type: "TRANSPORT.PROCESS_REPLY",
        message: {
          status: "success",
          slug: framing.slug,
          payload: { type: "aggregates", data },
        },
      });
    });
  };

  const setRoomTypes = (roomTypes: RoomType[]) => {
    act(() => {
      getCity().send({ type: "FILTER.SET_ROOM_TYPES", roomTypes });
    });
  };

  return {
    ...result,
    framing,
    navigateToCity,
    finishCityLoad,
    replyAggregates,
    setRoomTypes,
    get city() {
      return getCity();
    },
  };
}
