import type { ReactElement, ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";

import { makeLoadBrowsePoints } from "@/features/scene/shared/browse-points-query";
import { cityMachine } from "@/features/scene/state/machines/city/machine";
import { SystemId } from "@/features/scene/state/machines/constants";
import { rootMachine } from "@/features/scene/state/machines/root/machine";
import { workerMachine } from "@/features/scene/state/machines/worker/machine";
import { SceneActorContext } from "@/features/scene/state/provider";
import { SceneNotifications } from "@/features/scene/scene-notifications";
import { Toaster } from "@/components/ui/sonner";
import { makeQueryClient } from "@/lib/query/client";

import {
  createFakeTransport,
  type FakeTransport,
} from "./scene/fake-transport";

/**
 * Custom render: mounts the real scene actor system over the app providers,
 * faking only the worker transport (no Worker in jsdom) and no-oping the URL /
 * prefetch side-effects. Re-exports RTL + userEvent.
 */
type RootActorRef = ReturnType<typeof SceneActorContext.useActorRef>;

export interface SceneRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  /** The live root actor — dispatch `CITY.CHANGED` / read `system.get(...)`. */
  root: RootActorRef;
  /** The fake worker transport (recorded commands + reply replay). */
  transport: FakeTransport;
  queryClient: QueryClient;
}

// Retry off so error paths fail fast and deterministically; otherwise the real
// client (incl. the fetch-error → toast `onError`), so toast paths are faithful.
function makeTestQueryClient(): QueryClient {
  return makeQueryClient({ retry: false });
}

export function renderScene(
  ui: ReactElement,
  options: Omit<RenderOptions, "wrapper"> = {},
): SceneRenderResult {
  const transport = createFakeTransport();
  const queryClient = makeTestQueryClient();

  const logic = rootMachine.provide({
    actors: {
      worker: workerMachine.provide({ actors: { transport: transport.actor } }),
      city: cityMachine.provide({
        actors: { loadBrowsePoints: makeLoadBrowsePoints(queryClient) },
      }),
    },
    actions: { syncUrl: () => {}, prefetchCity: () => {} },
  });

  const holder: { root: RootActorRef | null } = { root: null };
  function CaptureRoot() {
    holder.root = SceneActorContext.useActorRef();
    return null;
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          enableSystem={false}
          defaultTheme="light"
        >
          <SceneActorContext.Provider
            logic={logic}
            options={{ systemId: SystemId.ROOT }}
          >
            <CaptureRoot />
            <SceneNotifications />
            {children}
            <Toaster />
          </SceneActorContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  const result = rtlRender(ui, { wrapper: Wrapper, ...options });
  if (!holder.root) {
    throw new Error("renderScene: root actor was not captured");
  }
  return {
    user: userEvent.setup(),
    root: holder.root,
    transport,
    queryClient,
    ...result,
  };
}

// Testing Library re-exports — the single import surface for tests.
export * from "@testing-library/react";
export { userEvent };
