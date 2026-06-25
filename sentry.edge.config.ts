import * as Sentry from "@sentry/nextjs";
import { ignoredSentryErrors, scrubSentryEvent } from "./sentry.filters";

// Runs in the edge runtime (middleware, edge routes). Kept in lockstep with
// sentry.server.config.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  enabled: process.env.NODE_ENV === "production",
  ignoreErrors: ignoredSentryErrors,
  beforeSend: scrubSentryEvent,
});
