import * as Sentry from "@sentry/nextjs";
import {
  deniedSentryUrls,
  ignoredSentryErrors,
  scrubSentryEvent,
} from "./sentry.filters";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Errors-only: keep free-tier quota for real app failures.
  tracesSampleRate: 0,
  sendDefaultPii: false,

  enabled: process.env.NODE_ENV === "production",

  ignoreErrors: ignoredSentryErrors,
  denyUrls: deniedSentryUrls,
  beforeSend: scrubSentryEvent,
});

// Instruments client-side router navigations. A no-op while tracing is off
// (tracesSampleRate: 0); kept so navigation spans light up if tracing is enabled.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
