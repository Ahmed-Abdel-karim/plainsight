/**
 * Worker machine context. A single monotonic `nextRequestId` plus the id each
 * per-type region last issued (`hexesId` / `aggregatesId`). The region matches a
 * reply against its stored id to drop the stale reply of a superseded request;
 * `0` means "nothing in flight" (ids start at 1). There is no `slug`: the worker
 * is shared across cities and the slug rides on each request/reply.
 */
export interface Context {
  nextRequestId: number;
  hexesId: number;
  aggregatesId: number;
}
