"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

// Root error boundary: catches errors thrown in the root layout/template that
// the per-segment error.tsx boundaries can't reach, and reports them to Sentry.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page. Its type requires a
        `statusCode`, but the App Router doesn't expose one here, so we pass 0
        to render a generic message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
