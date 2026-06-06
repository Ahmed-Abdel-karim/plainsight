import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
          // jest-dom matchers + RTL cleanup need a DOM, so only the dom project.
          setupFiles: ["./vitest.setup.ts"],
          include: ["app/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});
