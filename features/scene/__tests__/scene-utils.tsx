import { http, HttpResponse } from "msw";

import { AnalysisCards } from "@/features/scene/analysis/analysis-cards";
import { FilterPanel } from "@/features/scene/analysis/filter-panel";
import { BrowsePanel } from "@/features/scene/browse";
import { useCityFraming } from "@/features/scene/state/machines/city/use-city";
import { LensActivity } from "@/features/scene/lens-activity";
import { LensSwitcher } from "@/features/scene/lens-switcher";
import { MapCanvas } from "@/features/scene/map/map-canvas";
import { SystemId } from "@/features/scene/state/machines/constants";
import type { CityMachineActor } from "@/features/scene/state/machines/city/machine";
import type { UiMachineActor } from "@/features/scene/state/machines/ui/machine";
import type { CityMeta, ScopeAggregates } from "@/data/contract";
import type { HexCell } from "@/lib/hex/types";
import type { Lens } from "@/lib/search-params";
import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";
import { server } from "@/test/msw/server";
import { act, renderScene, type SceneRenderResult } from "@/test/render";

/** Make the next `/points` fetch fail (call before the browse lens triggers it). */
export function failPoints() {
  server.use(
    http.get("/city-assets/:slug/:snapshot/points.geojson", () =>
      HttpResponse.error(),
    ),
  );
}

/** Make the next `/boundaries` fetch fail (call before navigating). */
export function failBoundaries() {
  server.use(
    http.get("/city-assets/:slug/:snapshot/boundaries.geojson", () =>
      HttpResponse.error(),
    ),
  );
}

/** A fully-populated scope (above the floor) so the analysis cards show real
 *  numbers; `medianPrice` is the value the cross-region cases assert on. */
export function richAggregates(medianPrice: number): ScopeAggregates {
  return makeAggregates({
    listingCount: 1000,
    meetsFloor: true,
    medianPrice,
    multiListingHostShare: 0.42,
    avgReviewsPerMonth: 1.2,
    roomTypeMix: {
      "Entire home/apt": 600,
      "Private room": 300,
      "Shared room": 80,
      "Hotel room": 20,
    },
    topHosts: [{ hostId: 1, hostName: "Ada", count: 9 }],
    priceHistogram: [
      { x0: 0, x1: 100, count: 200 },
      { x0: 100, x1: 200, count: 500 },
    ],
  });
}

/**
 * Mounts `FilterPanel` only once a city is framed — which is when its price
 * bounds become valid. City-less, `priceBounds(null)` is `{min:0,max:0}`, so the
 * slider thumb resolves to `NaN%`; browsers ignore that, but jsdom's CSS parser
 * throws on it. The real app's first paint is browser-tolerant, so gating here is
 * faithful to when the panel is actually operable, not a workaround for a bug.
 */
function FilterWhenFramed({ cityMeta }: { cityMeta: CityMeta }) {
  const framed = useCityFraming() !== null;
  return framed ? <FilterPanel cityMeta={cityMeta} /> : null;
}

function cityMetaFor(slug: string): CityMeta {
  const framing = makeMapCityPayload({ slug });
  return {
    slug: framing.slug,
    snapshotId: framing.snapshotId,
    name: framing.cityName,
    country: "UK",
    frame: "",
    snapshotLabel: framing.snapshotLabel,
    currency: framing.currency,
    bbox: framing.bbox,
    center: framing.center,
    hexEnabled: true,
    priceScale: framing.priceScale,
    priceCap: framing.priceCap,
  };
}

export interface SceneSetup extends SceneRenderResult {
  framing: ReturnType<typeof makeMapCityPayload>;
  /** Act: spawn the city (default `analyse` lens). */
  navigateToCity: () => void;
  /** Act: the city's data load finishes, so it reaches `ready` and `FILTER.*` apply. */
  finishCityLoad: () => void;
  /** Act: switch the active lens via the ui machine. */
  setLens: (lens: Lens) => void;
  /** Act: the worker returns recomputed aggregates for the current scope. */
  replyAggregates: (data: ScopeAggregates) => void;
  /** Act: the worker returns recomputed hex cells. */
  replyHexes: (cells: HexCell[]) => void;
  /** Act: the worker's city-data load fails terminally. */
  failCityLoad: () => void;
  /** Act: a recompute fails (the city stays ready on its last good result). */
  failProcess: () => void;
  ui: UiMachineActor;
  readonly city: CityMachineActor;
}

/**
 * Arrange only — render the scene's client leaves (lens switcher, shared filter
 * panel, the Analyse/Browse swap, and the map) over one real actor system,
 * returning the acts for the test to perform. The single shared state is the
 * whole point: this is where a lens change or a filter change is proven to fan
 * out across regions.
 */
export function setupScene(
  options: { defaultAggregates?: ScopeAggregates } = {},
): SceneSetup {
  const framing = makeMapCityPayload();
  const defaultAggregates = options.defaultAggregates ?? richAggregates(150);

  const result = renderScene(
    <>
      <LensSwitcher />
      <FilterWhenFramed cityMeta={cityMetaFor(framing.slug)} />
      <LensActivity
        analysis={
          <AnalysisCards
            currency="GBP"
            snapshot={{ city: defaultAggregates, neighbourhoods: {} }}
          />
        }
        browse={<BrowsePanel />}
      />
      <MapCanvas />
    </>,
  );

  const ui = result.root.system.get(SystemId.UI) as UiMachineActor;
  const getCity = () =>
    result.root.system.get(SystemId.CITY) as CityMachineActor;

  const navigateToCity = () =>
    act(() => {
      result.root.send({
        type: "CITY.CHANGED",
        payload: framing,
        filter: { roomTypes: [], priceRange: null, nbhd: null },
      });
    });

  const finishCityLoad = () =>
    act(() => {
      getCity().send({
        type: "WORKER.FETCH_OK",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        count: 3,
      });
    });

  const setLens = (lens: Lens) =>
    act(() => {
      ui.send({ type: "UI.SET_LENS", lens });
    });

  const replyAggregates = (data: ScopeAggregates) =>
    act(() => {
      result.transport.reply({
        type: "TRANSPORT.PROCESS_REPLY",
        message: {
          status: "success",
          slug: framing.slug,
          snapshotId: framing.snapshotId,
          payload: { type: "aggregates", data },
        },
      });
    });

  const replyHexes = (cells: HexCell[]) =>
    act(() => {
      result.transport.reply({
        type: "TRANSPORT.PROCESS_REPLY",
        message: {
          status: "success",
          slug: framing.slug,
          snapshotId: framing.snapshotId,
          payload: { type: "hexes", data: cells },
        },
      });
    });

  const failCityLoad = () =>
    act(() => {
      getCity().send({
        type: "WORKER.FETCH_ERROR",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        error: new Error("boom"),
      });
    });

  const failProcess = () =>
    act(() => {
      getCity().send({
        type: "WORKER.PROCESS_ERROR",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        processType: "hexes",
        error: new Error("compute failed"),
      });
    });

  return {
    ...result,
    framing,
    navigateToCity,
    finishCityLoad,
    setLens,
    replyAggregates,
    replyHexes,
    failCityLoad,
    failProcess,
    ui,
    get city() {
      return getCity();
    },
  };
}
