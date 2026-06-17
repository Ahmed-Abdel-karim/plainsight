import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Centralized server-side error capture: Server Components, Route Handlers,
// middleware, and the edge runtime all funnel through here.
export const onRequestError = Sentry.captureRequestError;
