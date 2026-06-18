import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

// Scene state machines live under `components/` but are pure XState logic with no
// DOM, so they run in their own node-env project (faster, and proves DOM-freedom).
// The `dom` project must skip them to avoid double-running each file in jsdom.
const MACHINES_GLOB = "components/scene/state/**/*.test.{ts,tsx}";

const serverOnlyShim = fileURLToPath(
  new URL("./vitest.server-only.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve the `@/*` alias from tsconfig `paths` natively (no extra plugin).
    tsconfigPaths: true,
    // `data/loaders.ts` imports "server-only"; stub it everywhere.
    alias: { "server-only": serverOnlyShim },
  },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "lib/**/*.test.ts",
            "data/**/*.test.ts",
            "scripts/**/*.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          // A concrete origin so relative `/api/...` fetches resolve and MSW can
          // match them by pathname (see vitest.setup.ts).
          environmentOptions: { jsdom: { url: "http://localhost:3000" } },
          // jest-dom matchers + RTL cleanup need a DOM, so only the dom project.
          setupFiles: ["./vitest.setup.ts"],
          include: ["app/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
          // Machine tests run in the `machines` (node) project instead.
          exclude: [...configDefaults.exclude, MACHINES_GLOB],
        },
      },
      {
        extends: true,
        test: {
          name: "machines",
          environment: "node",
          include: [MACHINES_GLOB],
        },
      },
    ],
  },
});
