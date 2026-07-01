import { act } from "@testing-library/react";

import { SystemId } from "@/features/scene/state/machines/constants";
import type { CityMachineActor } from "@/features/scene/state/machines/city/machine";
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
  responseAggregates: (data: ScopeAggregates) => void;
  /** Act: the user narrows the room-type filter (a non-default, recompute-triggering change). */
  setRoomTypes: (roomTypes: RoomType[]) => void;
  readonly city: CityMachineActor;
}

/**
 * Arrange only — render the analysis cards over the real actor system with the
 * server's `defaultAggregates`, and return the acts (`navigateToCity`,
 * `finishCityLoad`, `responseAggregates`, `setRoomTypes`) for the test to perform.
 */
export function setupAnalysis(
  options: AnalysisSetupOptions = {},
): AnalysisSetup {
  const defaultAggregates = options.defaultAggregates ?? makeRichAggregates();
  const framing = makeMapCityPayload({
    cityListingCount: defaultAggregates.listingCount,
    ...options.framing,
  });
  const filter = {
    roomTypes: [] as RoomType[],
    priceRange: null as [number, number] | null,
    nbhd: null as string | null,
    ...options.filter,
  };

  const result = renderScene(
    <AnalysisCards
      currency="GBP"
      snapshot={{ city: defaultAggregates, neighbourhoods: {} }}
    />,
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
      result.transport.response({
        type: "TRANSPORT.LOAD_RESPONSE",
        message: {
          status: "success",
          slug: framing.slug,
          snapshotId: framing.snapshotId,
          payload: {
            type: "load",
            data: {
              slug: framing.slug,
              snapshotId: framing.snapshotId,
            },
          },
        },
      });
    });
  };

  const responseAggregates = (data: ScopeAggregates) => {
    act(() => {
      result.transport.response({
        type: "TRANSPORT.PROCESS_RESPONSE",
        message: {
          status: "success",
          slug: framing.slug,
          snapshotId: framing.snapshotId,
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
    responseAggregates,
    setRoomTypes,
    get city() {
      return getCity();
    },
  };
}
