import * as Sentry from "@sentry/nextjs";

// Runs in the edge runtime (middleware, edge routes). Kept in lockstep with
// sentry.server.config.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  // Active in production only — see sentry.server.config.ts.
  enabled: process.env.NODE_ENV === "production",
});
