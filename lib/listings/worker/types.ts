import type { Listing } from "@/data/contract";

/**
 * Worker-owned data every process runs against, passed as the second arg to
 * `execute` so it never has to travel on the wire (the client sends only the
 * per-request `params`; the worker injects the listings it already holds).
 */
export type ProcessContext = { listings: Listing[] };

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
  [K in keyof T]: {
    type: K;
    params: Parameters<T[K]["execute"]>[0];
    /** The city this request was issued for (stamped by the client). The worker
     *  echoes it back so a reply that outlived its city is dropped (Rule 5.3). */
    slug: string;
    snapshotId: string;
    /** Per-type request id assigned by the worker machine. The worker echoes it on
     *  the reply so a superseded/cancelled request's reply can be dropped. */
    requestId: number;
  };
}[keyof T];

type SuccessResponseMessage<P> = {
  status: "success";
  /** The slug this reply is for — the client drops it if it no longer matches. */
  slug: string;
  snapshotId: string;
  payload: P;
};

type ErrorResponseMessage<T> = {
  status: "error";
  slug: string;
  snapshotId: string;
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
      requestId: number;
    })
  | (ErrorResponseMessage<ExtractProcessType<T>> & { requestId: number });

export type RequestMessageType<T extends string, P> = {
  type: T;
  payload: P;
};

export type ResponseMessageType<T extends string, P> =
  | SuccessResponseMessage<P>
  | ErrorResponseMessage<T>;
