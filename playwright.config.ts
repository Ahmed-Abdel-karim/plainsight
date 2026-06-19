import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"], ["html"]],
  webServer: {
    command: `NEXT_PUBLIC_E2E=true pnpm build && PORT=${PORT} NEXT_PUBLIC_E2E=true pnpm start`,
    url: baseURL,
    // CI always builds fresh; locally, attach to an already-running `next start`
    // so iterating doesn't pay the production rebuild on every run.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_E2E: "true",
      PORT: String(PORT),
    },
  },
  use: {
    baseURL,
    // CI keeps traces lean (first retry only); locally, retries are 0, so keep a
    // trace + screenshot whenever a run fails to debug without re-running.
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        launchOptions: {
          args: ["--use-gl=angle", "--use-angle=swiftshader"],
        },
      },
    },
  ],
});
