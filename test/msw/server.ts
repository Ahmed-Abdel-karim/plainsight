import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { boundariesFixture, browsePointsFixture } from "@/test/fixtures/browse";

/**
 * MSW node server — intercepts the per-city route handlers the client fetches.
 * Default handlers serve the browse fixtures; override per-test with `server.use`.
 * Lifecycle (listen/reset/close) is wired in `vitest.setup.ts`.
 */
export const handlers = [
  http.get("/api/cities/:slug/points", () =>
    HttpResponse.json(browsePointsFixture),
  ),
  http.get("/api/cities/:slug/boundaries", () =>
    HttpResponse.json(boundariesFixture),
  ),
];

export const server = setupServer(...handlers);
