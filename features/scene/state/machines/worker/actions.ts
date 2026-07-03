import * as Sentry from "@sentry/nextjs";
import { assertEvent, setup } from "xstate";

import type { ProcessResponseMessage } from "@/lib/listings";

import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import { transportActor } from "./controller/transport-actor";
import type * as Context from "./context";
import type * as Events from "./events";
import type { ProcessResult } from "./events";
import { workerGuards } from "./guards";
import type * as Input from "./input";
import { buildRequest } from "./request";

function toResult(message: ProcessResponseMessage): ProcessResult {
  return {
    type: message.payload.type,
    payload: "data" in message.payload ? message.payload.data : undefined,
    slug: message.slug,
    snapshotId: message.snapshotId,
  } as ProcessResult;
}

const cityOf = (system: { get: (id: string) => unknown }) =>
  system.get(SystemId.CITY) as CityMachineActor | undefined;

// This local setup provides strongly typed XState action creators. The machine
// imports the resulting implementations into its own setup declaration.
const actionSetup = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    transport: transportActor,
  },
  guards: workerGuards,
});

export const workerActions = {
  sendLoadDataRequest: actionSetup.enqueueActions(({ event, enqueue }) => {
    assertEvent(event, "WORKER.REQUEST_LOAD");
    enqueue.assign({
      requestedDataset: { slug: event.slug, snapshotId: event.snapshotId },
      error: null,
    });
    enqueue.sendTo("transport", {
      type: "LOAD",
      payload: {
        slug: event.slug,
        snapshotId: event.snapshotId,
        assetUrl: event.assetUrl,
      },
    });
  }),

  cancelTransportLoad: actionSetup.sendTo("transport", { type: "CANCEL_LOAD" }),

  clearRequestedCityData: actionSetup.assign({ requestedDataset: null }),

  // Scene reset: drop all dataset identity so the region returns to its initial
  // `unloaded` context (the worker thread is being torn down / re-created empty).
  clearDatasets: actionSetup.assign({
    requestedDataset: null,
    loadedDataset: null,
    error: null,
  }),

  // Tell the transport to abandon any in-flight load and reset its controller.
  sendReset: actionSetup.sendTo("transport", { type: "RESET" as const }),

  markLoaded: actionSetup.assign(({ event }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    return {
      loadedDataset: {
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
      },
      error: null,
    };
  }),

  routeLoadOk: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_OK",
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
      });
  }),

  // Tell the controller its listings are ready so it flushes any held calculation
  // targets. Sent only on a current-dataset load success (`loadSucceeded` guard).
  sendDataReady: actionSetup.sendTo("transport", ({ event }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    return {
      type: "DATA_READY" as const,
      dataset: {
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
      },
    };
  }),

  routeLoadError: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    if (event.message.status !== "error") return;
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_ERROR",
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
        error: event.message.payload.error,
      });
  }),

  recordLoadError: actionSetup.assign(({ event }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    return {
      error:
        event.message.status === "error"
          ? event.message.payload.error
          : new Error("load failed"),
    };
  }),

  ackCachedLoad: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "WORKER.REQUEST_LOAD");
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_OK",
        slug: event.slug,
        snapshotId: event.snapshotId,
      });
  }),

  captureWorkerError: actionSetup.enqueueActions(({ event }) => {
    assertEvent(event, "TRANSPORT.WORKER_ERROR");
    Sentry.captureException(event.error, { tags: { boundary: "worker" } });
  }),

  recordFatalError: actionSetup.assign(({ event }) => {
    assertEvent(event, "TRANSPORT.WORKER_ERROR");
    return { error: event.error };
  }),

  // Tell the current city analysis is unavailable, stamping its own framing so it
  // routes to whichever leg's error state (see city's WORKER.FATAL_ERROR handler).
  routeWorkerFatal: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.WORKER_ERROR");
    const city = cityOf(system);
    if (!city) return;
    const framing = city.getSnapshot().context.framing;
    enqueue.sendTo(city, {
      type: "WORKER.FATAL_ERROR",
      slug: framing?.slug ?? "",
      snapshotId: framing?.snapshotId ?? "",
      error: event.error,
    });
  }),

  // Forward a calculation request to the controller, which owns coalescing,
  // caching, and the hold-until-loaded gate. The machine only builds the message.
  forwardCalcRequest: actionSetup.sendTo("transport", ({ event }) => {
    assertEvent(event, ["WORKER.REQUEST_HEXES", "WORKER.REQUEST_AGGREGATES"]);
    return { type: "REQUEST" as const, message: buildRequest(event) };
  }),

  // Route a controller-delivered result to the current city: success as a result,
  // failure as a process error. Runs only while active, so browse ignores it.
  routeProcessResult: actionSetup.enqueueActions(
    ({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.PROCESS_RESULT");
      const { response } = event;
      const city = cityOf(system);
      if (!city) return;
      if (response.status === "success")
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_RESULT",
          result: toResult(response),
        });
      else
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_ERROR",
          slug: response.slug,
          snapshotId: response.snapshotId,
          processType: response.payload.type,
          error: response.payload.error,
        });
    },
  ),
};
