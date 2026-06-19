"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { makeQueryClient } from "@/lib/query/client";

/**
 * Mounts the React Query cache for the main thread. The client is created once
 * per component instance via `useState` (never during render), so each browser
 * tab and each SSR pass gets its own client — the standard App Router pattern
 * that keeps the static shell hydration-safe. Defaults (retry + cache) and the
 * fetch-error toast wiring live in `@/lib/query/client`, shared with tests.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
