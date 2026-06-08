"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { queryDefaults } from "@/lib/query/config";

/**
 * Mounts the React Query cache for the main thread. The client is created once
 * per component instance via `useState` (never during render), so each browser
 * tab and each SSR pass gets its own client — the standard App Router pattern
 * that keeps the static shell hydration-safe. Defaults are shared with the
 * listings worker (`@/lib/query/config`) so every fetch retries + caches alike.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: queryDefaults }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
