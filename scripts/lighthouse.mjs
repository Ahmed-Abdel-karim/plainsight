// Run a local Lighthouse performance report against the prod server.
//   pnpm lighthouse /london          (mobile, the default throttled view)
//   pnpm lighthouse /london desktop  (desktop preset)
//   pnpm lighthouse /                (landing)
// Wraps the official `lighthouse` CLI, injecting this environment's required
// CHROME_PATH (Playwright's chromium) and WSL-safe chrome flags so headless
// WebGL renders and Chrome's profile never lands in the repo.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { get } from "node:http";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);

const [, , routeArg = "/", formFactor = "mobile"] = process.argv;
const url = routeArg.startsWith("http")
  ? routeArg
  : `http://localhost:3000${routeArg.startsWith("/") ? "" : "/"}${routeArg}`;

const slug =
  new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
const outDir = "/tmp/lighthouse";
const outPath = `${outDir}/${slug}-${formFactor}.html`;
mkdirSync(outDir, { recursive: true });

const isWsl =
  !!process.env.WSL_DISTRO_NAME ||
  (() => {
    try {
      return readFileSync("/proc/version", "utf8")
        .toLowerCase()
        .includes("microsoft");
    } catch {
      return false;
    }
  })();

const reachable = await new Promise((resolve) => {
  const req = get(url, (res) => {
    res.resume();
    resolve(true);
  });
  req.setTimeout(2000, () => req.destroy());
  req.on("error", () => resolve(false));
});
if (!reachable) {
  console.error(
    `✗ ${url} is not reachable. Run \`pnpm start\` first (prod build).`,
  );
  process.exit(1);
}

const args = [
  require.resolve("lighthouse/cli/index.js"),
  url,
  "--only-categories=performance",
  "--output=html",
  `--output-path=${outPath}`,
  "--quiet",
  "--chrome-flags=--headless=new --no-sandbox --enable-unsafe-swiftshader --disable-gpu --user-data-dir=/tmp/lh-chrome",
  ...(formFactor === "desktop" ? ["--preset=desktop"] : []),
  // On WSL, xdg-open can't reach the Windows browser, so open it ourselves below.
  ...(isWsl ? [] : ["--view"]),
];

const { status } = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, CHROME_PATH: chromium.executablePath() },
});

console.log(`\nReport: ${outPath}`);
if (isWsl) {
  const win = spawnSync("wslpath", ["-w", outPath], { encoding: "utf8" });
  if (win.status === 0) spawnSync("explorer.exe", [win.stdout.trim()]);
}
process.exit(status ?? 0);
