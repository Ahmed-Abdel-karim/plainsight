import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Errors-only. No performance tracing, no session replay.
  tracesSampleRate: 0,
  sendDefaultPii: false,

  // Disabled for now — see sentry.server.config.ts.
  enabled: false,
});
