"use client";

import * as Sentry from "@sentry/nextjs";
import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

import { Button } from "@/components/ui/button";

/**
 * Closed registry of monitored UI regions. Each value tags the error in Sentry,
 * so this union is the source of truth for which islands are independently
 * isolated — add a region here before wrapping it. Kept with the component (not
 * a feature) because it is an observability concern, not feature internals.
 */
export type BoundaryId =
  | "scene.map"
  | "scene.analysis"
  | "scene.browse"
  | "scene.listing-detail"
  | "scene.filters";

type FeatureBoundaryProps = {
  /** Region identifier; becomes the Sentry `boundary` tag for grouping. */
  id: BoundaryId;
  children: ReactNode;
  /** Custom fallback. Omit for the default inline alert with a retry button. */
  fallback?: ReactNode;
  /**
   * When this value changes, a tripped boundary auto-resets — e.g. pass the
   * city slug so navigating away from a failed view clears the error.
   */
  resetKey?: unknown;
};

/**
 * Component-level error boundary that isolates a single region: a thrown render
 * error is caught here and reported to Sentry tagged with `id`, so the rest of
 * the app keeps working. Route-level `error.tsx` is the coarse per-segment net;
 * this is the granular per-island one. Pair with `AsyncBoundary` for the pending
 * state (Suspense handles loading, this handles throws).
 *
 * Thin wrapper over `react-error-boundary` that owns our domain contract: the
 * typed `id` registry and the Sentry tag. Call sites pass a single `resetKey`;
 * the array-based `resetKeys` is an implementation detail.
 */
export function FeatureBoundary({
  id,
  children,
  fallback,
  resetKey,
}: FeatureBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={[resetKey]}
      onError={(error) =>
        Sentry.captureException(error, { tags: { boundary: id } })
      }
      fallbackRender={(props) =>
        fallback ?? <FeatureBoundaryFallback {...props} />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

function FeatureBoundaryFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-stack rounded-lg border border-border p-gutter"
    >
      <div className="flex flex-col gap-snug">
        <p className="text-foreground type-body">Something went wrong</p>
        <p className="type-caption text-muted-foreground">
          This section failed to load. The rest of the page still works.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}
