// Run Lighthouse CI (collect → assert budgets → upload) against the prod build.
//   pnpm build && pnpm lhci
// Resolves Chrome from Playwright (no system Chrome locally; the CI job installs
// chromium the same way), so `lhci autorun` reads it via CHROME_PATH. The WSL-safe
// flags + /tmp profile dir live in lighthouserc.json.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);

const { status } = spawnSync(
  process.execPath,
  [
    require.resolve("@lhci/cli/src/cli.js"),
    "autorun",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, CHROME_PATH: chromium.executablePath() },
  },
);
process.exit(status ?? 0);
