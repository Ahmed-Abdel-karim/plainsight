import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Errors-only. No performance tracing, no session replay.
  tracesSampleRate: 0,
  sendDefaultPii: false,

  // Active in production only — see sentry.server.config.ts.
  enabled: process.env.NODE_ENV === "production",
});

// Instruments client-side router navigations. A no-op while tracing is off
// (tracesSampleRate: 0); kept so navigation spans light up if tracing is enabled.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
