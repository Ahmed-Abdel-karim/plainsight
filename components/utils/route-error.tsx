"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  /** The error caught by the route's `error.tsx`; reported to Sentry on mount. */
  error: Error & { digest?: string };
  /** Re-renders the segment, retrying the render that threw. */
  reset: () => void;
  title?: string;
  description?: string;
};

/**
 * Shared fallback for route-level `error.tsx` boundaries — the coarse per-segment
 * net above the granular `FeatureBoundary` islands. Reports to Sentry on mount
 * (a no-op while Sentry is disabled) and offers a retry plus an escape home.
 */
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "This view couldn’t load. Try again, or head back to the start.",
}: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-screen w-full flex-1 flex-col items-center justify-center gap-stack p-section text-center"
    >
      <div className="flex flex-col gap-snug">
        <h1 className="type-title text-foreground">{title}</h1>
        <p className="max-w-sm type-caption text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-inline">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
