import type { MapRef } from "react-map-gl/maplibre";
import { createActor, fromCallback, fromPromise } from "xstate";

import type { BrowseCollection } from "@/data/contract";
import type {
  LoadDataResponseMessage,
  ProcessResponseMessage,
} from "@/lib/listings/worker";
import {
  createFakeMaplibreMap,
  type FakeMaplibreMap,
} from "@/test/scene/fake-map";

import { cityMachine } from "../city/machine";
import { SystemId } from "../constants";
import { rootMachine } from "../root/machine";
import { workerMachine } from "../worker/machine";
import type { TransportCommand, TransportInput } from "../worker/transport";

const EMPTY_BROWSE_COLLECTION: BrowseCollection = {
  type: "FeatureCollection",
  features: [],
};

/** A points loader that resolves to an empty tier — the connected-system tests
 *  only care that the browse leg converges, not the rows. */
const fakeLoadBrowsePoints = fromPromise<
  BrowseCollection,
  { slug: string; snapshotId: string }
>(async () => EMPTY_BROWSE_COLLECTION);

/** A points loader that rejects — exercises the Browse leg's terminal failure. */
const failingLoadBrowsePoints = fromPromise<
  BrowseCollection,
  { slug: string; snapshotId: string }
>(async () => {
  throw new Error("browse load failed");
});

/**
 * Boots the *real* connected actor system (root + map + ui + worker), substituting
 * only the one un-runnable boundary: the worker `transport`, which would otherwise
 * spawn a real Web Worker (impossible in node/jsdom). Injection happens at the
 * transport level rather than via the `createWorker` seam — see
 * `docs/testing-strategy.md`.
 */

/** The reply events the real transport sends up to the worker machine. */
export type TransportReply =
  | { type: "TRANSPORT.LOAD_REPLY"; message: LoadDataResponseMessage }
  | { type: "TRANSPORT.PROCESS_REPLY"; message: ProcessResponseMessage }
  | { type: "TRANSPORT.WORKER_ERROR"; error: Error };

/**
 * A drop-in replacement for `transportActor`: it records the commands the worker
 * posts (so tests can assert what was requested) and lets a test replay worker
 * replies on demand — no real `Worker`, no timers, fully deterministic.
 */
function createFakeTransport() {
  const commands: TransportCommand[] = [];
  let sendBack: ((event: TransportReply) => void) | null = null;

  const actor = fromCallback<TransportCommand, TransportInput>(
    ({ sendBack: sb, receive }) => {
      sendBack = sb;
      receive((command) => {
        commands.push(command);
      });
      return () => {
        sendBack = null;
      };
    },
  );

  return {
    actor,
    /** Commands the worker machine posted to the transport, in order. */
    commands,
    /** Replay a worker reply (throws if the transport isn't running). */
    reply(event: TransportReply) {
      if (!sendBack) throw new Error("fake transport is not running");
      sendBack(event);
    },
  };
}

/**
 * Start the connected scene system for a test. Returns the root actor, the fake
 * transport controller, lazy accessors for the session child actors, and a
 * `stop()` for teardown. The `syncUrl` / `prefetchCity` actions are no-oped so a
 * test never touches the URL or the network.
 */
export function setupSceneSystem({ failBrowse = false } = {}) {
  const transport = createFakeTransport();

  const testRootMachine = rootMachine.provide({
    actors: {
      worker: workerMachine.provide({ actors: { transport: transport.actor } }),
      city: cityMachine.provide({
        actors: {
          loadBrowsePoints: failBrowse
            ? failingLoadBrowsePoints
            : fakeLoadBrowsePoints,
        },
      }),
    },
    actions: {
      syncUrl: () => {},
      prefetchCity: () => {},
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
    get city() {
      return actor.system.get(SystemId.CITY);
    },
    stop() {
      actor.stop();
    },
  };
}

/**
 * Mount a fake MapLibre instance into the running scene and bring the map actor
 * to `ready.interactive` (`MAP.MOUNTED` then `MAP.READY`). Returns the spied map
 * methods for assertions.
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
