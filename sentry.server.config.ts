import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Errors-only: spend the whole free-tier quota on errors, not transactions.
  tracesSampleRate: 0,

  // Don't attach/store IP or request bodies as PII. Sentry still derives
  // coarse geo (country/region) from the connecting IP at ingest, so the
  // "from country X" signal survives without storing a personal identifier.
  sendDefaultPii: false,

  // Active in production only; local dev and tests never send (and a missing
  // DSN no-ops the SDK regardless).
  enabled: process.env.NODE_ENV === "production",
});
