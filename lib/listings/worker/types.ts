import type { Listing } from "@/data/contract";

/**
 * Worker-owned data every process runs against, passed as the second arg to
 * `execute` so it never has to travel on the wire (the client sends only the
 * per-request `params`; the worker injects the listings it already holds).
 */
export type ProcessContext = { listings: Listing[] };

/** The city + snapshot a message is stamped for, so a response that outlived its
 *  city is dropped (Rule 5.3). Rides on every request and echoes on every response. */
type CityStamp = { slug: string; snapshotId: string };

/**
 * The extendable process registry. Each entry is one recompute: `execute` takes
 * the client-supplied `params` plus the worker `ctx`. Add a process by adding an
 * entry — the request/response message unions below are derived from it, so the
 * client and worker need no further edits.
 */
export type ProcessConfig<T extends string, P = any, O = any, C = any> = {
  [k in T]: {
    execute: (params: P, ctx: C) => O;
    cacheResults?: boolean;
  };
};

export type ExtractProcessRequestMessage<T extends ProcessConfig<any>> = {
  [K in keyof T]: CityStamp & {
    type: K;
    params: Parameters<T[K]["execute"]>[0];
    requestId: string;
  };
}[keyof T];

type SuccessResponseMessage<P> = CityStamp & {
  status: "success";
  payload: P;
};

type ErrorResponseMessage<T> = CityStamp & {
  status: "error";
  payload: {
    type: T;
    error: Error;
  };
};

type ExtractProcessSuccessPayload<T extends ProcessConfig<any>> = {
  [K in keyof T]: { type: K; data: ReturnType<T[K]["execute"]> };
}[keyof T];

export type ExtractProcessType<T extends ProcessConfig<any>> = keyof T;

export type ExtractProcessResponseMessage<T extends ProcessConfig<any>> =
  | (SuccessResponseMessage<ExtractProcessSuccessPayload<T>> & {
      requestId: string;
    })
  | (ErrorResponseMessage<ExtractProcessType<T>> & { requestId: string });

export type RequestMessageType<T extends string, P> = {
  type: T;
  payload: P;
};

export type ResponseMessageType<T extends string, P> =
  | SuccessResponseMessage<P>
  | ErrorResponseMessage<T>;
