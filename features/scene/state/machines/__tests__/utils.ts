import type { MapRef } from "react-map-gl/maplibre";
import { createActor, fromPromise } from "xstate";

import type { BrowseCollection } from "@/data/contract";
import {
  createFakeMaplibreMap,
  type FakeMaplibreMap,
} from "@/test/scene/fake-map";
import { createFakeTransport } from "@/test/scene/fake-transport";

import { cityMachine } from "../city/machine";
import { SystemId } from "../constants";
import { rootMachine } from "../root/machine";
import type { PrefetchAction } from "../root/prefetch";
import { workerMachine } from "../worker";

const EMPTY_BROWSE_COLLECTION: BrowseCollection = {
  type: "FeatureCollection",
  features: [],
};

/** A readiness gate that resolves to an empty tier — the connected-system tests
 *  only care that the browse leg converges, not the rows. */
const fakeBrowseReady = fromPromise<
  BrowseCollection,
  { slug: string; snapshotId: string }
>(async () => EMPTY_BROWSE_COLLECTION);

/** A readiness gate that rejects — exercises the Browse leg's terminal failure. */
const failingBrowseReady = fromPromise<
  BrowseCollection,
  { slug: string; snapshotId: string }
>(async () => {
  throw new Error("browse load failed");
});

/**
 * Start the connected scene system for a test. Returns the root actor, the fake
 * transport controller, lazy accessors for the session child actors, and a
 * `stop()` for teardown. Only the worker `transport` is substituted — with the
 * real `ProcessController` running behind a faked Worker (see
 * `@/test/scene/fake-transport`). The `syncUrl` action is no-oped so a test never
 * touches the URL; `prefetch` is a no-op by default (only the provider overrides
 * it).
 */
export function setupSceneSystem({
  failBrowse = false,
  onSyncUrl = () => {},
  prefetch,
}: {
  failBrowse?: boolean;
  onSyncUrl?: () => void;
  /** Real `makePrefetch` result to exercise the nav-window warm path; the
   *  default keeps `prefetch` a no-op (only the provider wires the real one). */
  prefetch?: PrefetchAction;
} = {}) {
  const transport = createFakeTransport();

  const testRootMachine = rootMachine.provide({
    actors: {
      worker: workerMachine.provide({ actors: { transport: transport.actor } }),
      city: cityMachine.provide({
        actors: {
          ensureBrowseReady: failBrowse ? failingBrowseReady : fakeBrowseReady,
        },
      }),
    },
    actions: {
      syncUrl: onSyncUrl,
      ...(prefetch ? { prefetch } : {}),
    },
  });

  // Register the root under SystemId.ROOT exactly as the provider does, so the
  // city's `system.get(ROOT)` fan-out (CITY.READY / CITY.FAILED) resolves.
  const actor = createActor(testRootMachine, {
    input: {},
    systemId: SystemId.ROOT,
  });
  actor.start();

  return {
    actor,
    transport,
    get map() {
      return actor.system.get(SystemId.MAP);
    },
    get ui() {
      return actor.system.get(SystemId.UI);
    },
    get worker() {
      return actor.system.get(SystemId.WORKER);
    },
    get navigation() {
      return actor.system.get(SystemId.NAVIGATION);
    },
    get city() {
      return actor.system.get(SystemId.CITY);
    },
    stop() {
      actor.stop();
    },
  };
}

/**
 * Converge a city the way the real worker does: drive a successful load response
 * through the fake transport so the worker transitions `loading → loaded` and
 * routes `FETCH_OK` to the current city (which advances its analyse leg to
 * `ready`). Use this instead of sending `WORKER.FETCH_OK` straight to the city.
 * Calculation results are replayed separately via `transport.workerReply(...)`.
 */
export function finishLoad(
  scene: ReturnType<typeof setupSceneSystem>,
  framing: { slug: string; snapshotId: string },
) {
  scene.transport.response({
    type: "TRANSPORT.LOAD_RESPONSE",
    message: {
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: {
        type: "load",
        data: { slug: framing.slug, snapshotId: framing.snapshotId },
      },
    },
  });
}

/**
 * Mount a fake MapLibre instance into the running scene and bring the map actor
 * to lifecycle `ready` while interaction remains `interactive` (`MAP.MOUNTED`
 * then `MAP.READY`). Returns the spied map methods for assertions.
 */
export function mountFakeMap(
  scene: ReturnType<typeof setupSceneSystem>,
): FakeMaplibreMap {
  const map = createFakeMaplibreMap();
  const mapRef = { getMap: () => map } as unknown as MapRef;
  scene.map?.send({ type: "MAP.MOUNTED", mapRef });
  scene.map?.send({ type: "MAP.READY" });
  return map;
}
