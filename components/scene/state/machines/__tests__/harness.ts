import type { MapRef } from "react-map-gl/maplibre";
import { vi } from "vitest";
import { createActor, fromCallback } from "xstate";

import type {
  LoadDataResponseMessage,
  ProcessResponseMessage,
} from "@/lib/listings/worker";

import { SystemId } from "../constants";
import { rootMachine } from "../root/machine";
import { workerMachine } from "../worker/machine";
import type { TransportCommand, TransportInput } from "../worker/transport";

/**
 * Phase A test harness — boots the *real* connected actor system (root + map +
 * ui + worker), substituting only the one un-runnable boundary: the worker
 * `transport`, which would otherwise spawn a real Web Worker (impossible in
 * node/jsdom). See `docs/testing-strategy.md` (Phase A) for why injection
 * happens at the transport level rather than via the `createWorker` seam.
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
export function startSceneSystem() {
  const transport = createFakeTransport();

  const testRootMachine = rootMachine.provide({
    actors: {
      worker: workerMachine.provide({ actors: { transport: transport.actor } }),
    },
    actions: {
      syncUrl: () => {},
      prefetchCity: () => {},
    },
  });

  const actor = createActor(testRootMachine, { input: {} });
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
 * The MapLibre-instance methods the map machine drives imperatively. Spied so a
 * test can assert the *contract* with MapLibre (Principle 2's imperative
 * assertion) without a real WebGL canvas — `getSource` returns a truthy stub so
 * the feature-state code paths run.
 */
export interface FakeMaplibreMap {
  getSource: ReturnType<typeof vi.fn>;
  setFeatureState: ReturnType<typeof vi.fn>;
  removeFeatureState: ReturnType<typeof vi.fn>;
  fitBounds: ReturnType<typeof vi.fn>;
  setMaxBounds: ReturnType<typeof vi.fn>;
}

/**
 * Mount a fake MapLibre instance into the running scene and bring the map actor
 * to `ready.interactive` (`MAP.MOUNTED` then `MAP.READY`). Returns the spied map
 * methods for assertions.
 */
export function mountFakeMap(
  scene: ReturnType<typeof startSceneSystem>,
): FakeMaplibreMap {
  const map: FakeMaplibreMap = {
    getSource: vi.fn(() => ({})),
    setFeatureState: vi.fn(),
    removeFeatureState: vi.fn(),
    fitBounds: vi.fn(),
    setMaxBounds: vi.fn(),
  };
  const mapRef = { getMap: () => map } as unknown as MapRef;
  scene.map?.send({ type: "MAP.MOUNTED", mapRef });
  scene.map?.send({ type: "MAP.READY" });
  return map;
}
