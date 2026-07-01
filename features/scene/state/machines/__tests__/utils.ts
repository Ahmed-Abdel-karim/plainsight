import type { MapRef } from "react-map-gl/maplibre";
import { createActor, fromCallback, fromPromise } from "xstate";

import type { BrowseCollection } from "@/data/contract";
import type {
  LoadDataResponseMessage,
  ProcessResponseMessage,
} from "@/lib/listings";
import {
  createFakeMaplibreMap,
  type FakeMaplibreMap,
} from "@/test/scene/fake-map";

import { cityMachine } from "../city/machine";
import { SystemId } from "../constants";
import { rootMachine } from "../root/machine";
import type { PrefetchAction } from "../root/prefetch";
import { workerMachine } from "../worker";
import type { TransportCommand, TransportInput } from "../worker/transport";

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
 * Boots the *real* connected actor system (root + map + ui + worker), substituting
 * only the one un-runnable boundary: the worker `transport`, which would otherwise
 * spawn a real Web Worker (impossible in node/jsdom). Injection happens at the
 * transport level rather than via the `createWorker` seam — see
 * `docs/testing-strategy.md`.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A process response a test replays. `requestId` is optional: omitted, it is stamped
 *  with the latest matching POST's id (the current request); supply it explicitly
 *  to replay a stale/cancelled request's response and assert it is dropped. */
export type TestProcessResponse = DistributiveOmit<
  ProcessResponseMessage,
  "requestId"
> & {
  requestId?: string;
};

/** The response events the real transport sends up to the worker machine. */
export type TransportResponse =
  | { type: "TRANSPORT.LOAD_RESPONSE"; message: LoadDataResponseMessage }
  | { type: "TRANSPORT.PROCESS_RESPONSE"; message: TestProcessResponse }
  | { type: "TRANSPORT.WORKER_ERROR"; error: Error };

/**
 * A drop-in replacement for `transportActor`: it records the commands the worker
 * posts (so tests can assert what was requested) and lets a test replay worker
 * responses on demand — no real `Worker`, no timers, fully deterministic.
 */
function createFakeTransport() {
  const commands: TransportCommand[] = [];
  let sendBack: ((event: TransportResponse) => void) | null = null;

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

  const latestRequestId = (type: ProcessResponseMessage["payload"]["type"]) => {
    for (let i = commands.length - 1; i >= 0; i--) {
      const command = commands[i];
      if (command.type === "POST" && command.message.type === type)
        return command.message.requestId;
    }
    return undefined;
  };

  return {
    actor,
    /** Commands the worker machine posted to the transport, in order. */
    commands,
    /** Replay a worker response (throws if the transport isn't running). */
    response(event: TransportResponse) {
      if (!sendBack) throw new Error("fake transport is not running");
      if (event.type === "TRANSPORT.PROCESS_RESPONSE") {
        const requestId =
          event.message.requestId ??
          latestRequestId(event.message.payload.type);
        sendBack({
          type: "TRANSPORT.PROCESS_RESPONSE",
          message: { ...event.message, requestId: requestId ?? "" },
        });
        return;
      }
      sendBack(event);
    },
  };
}

/**
 * Start the connected scene system for a test. Returns the root actor, the fake
 * transport controller, lazy accessors for the session child actors, and a
 * `stop()` for teardown. The `syncUrl` action is no-oped so a test never touches
 * the URL; `prefetch` is a no-op by default (only the provider overrides it).
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
 * through the fake transport so the worker transitions `loading → ready`, routes
 * `FETCH_OK` to the current city, and flushes any held recomputes. Use this
 * instead of sending `WORKER.FETCH_OK` straight to the city — the worker only
 * posts recomputes once it is `ready`.
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
