import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CITY = process.argv[2] ?? "amsterdam";
const OUT = process.env.OUT ?? "/tmp/plainsight-run-app";
const url = `${BASE_URL}/${CITY}`;

mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail: String(detail ?? "") });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
};
const attempt = async (name, operation) => {
  try {
    await operation();
  } catch (error) {
    check(name, false, error instanceof Error ? error.message : String(error));
  }
};
const screenshot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${CITY}-${name}.png`, fullPage: true });
};
const hasText = async (page, text) => (await page.getByText(text).count()) > 0;
const waitForScene = async (page) => {
  await page.waitForSelector('div[aria-label^="Map of"]', { timeout: 20000 });
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading map"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
};
const axeViolations = async (page) => {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    const report = await window.axe.run(document, {
      resultTypes: ["violations", "incomplete"],
    });
    return {
      serious: report.violations
        .filter((item) => ["serious", "critical"].includes(item.impact))
        .map((item) => item.id),
      incompleteContrast: report.incomplete
        .filter((item) => item.id === "color-contrast")
        .reduce((count, item) => count + item.nodes.length, 0),
    };
  });
};
const devOverlayText = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("nextjs-portal")]
      .map(
        (portal) =>
          portal.shadowRoot
            ?.querySelector("[data-nextjs-dialog-overlay]")
            ?.textContent?.trim() ?? "",
      )
      .filter(Boolean)
      .join("\n"),
  );

let browser;
let page;
const pageErrors = [];

try {
  browser = await chromium.launch({
    args: [
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(5000);
  page.on("pageerror", (error) => pageErrors.push(error.message.split("\n")[0]));

  await attempt("scene loads", async () => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForScene(page);
    check("scene loads", true);
  });

  await attempt("no client runtime errors", async () => {
    check("no client runtime errors", pageErrors.length === 0, pageErrors[0] ?? "");
  });
  await attempt("no Next.js development error overlay", async () => {
    const overlay = await devOverlayText(page);
    check("no Next.js development error overlay", overlay.length === 0, overlay.slice(0, 240));
  });
  await attempt("dark is the default theme", async () => {
    check(
      "dark is the default theme",
      await page.evaluate(() => document.documentElement.classList.contains("dark")),
    );
  });
  await attempt("WebGL map rendered", async () => {
    check("WebGL map rendered", !(await hasText(page, "Map unavailable")));
  });
  await attempt("MapLibre canvas present", async () => {
    check("MapLibre canvas present", (await page.locator("canvas.maplibregl-canvas").count()) > 0);
  });
  await attempt("provider attribution present", async () => {
    check("provider attribution present", (await page.locator(".maplibregl-ctrl-attrib").count()) > 0);
  });
  await attempt("map legend present", async () => {
    check(
      "map legend present",
      (await page.getByRole("complementary", { name: "Map legend" }).count()) > 0,
    );
  });
  await attempt("capture dark screenshot", async () => {
    await screenshot(page, "dark");
    check("capture dark screenshot", true);
  });
  await attempt("axe dark", async () => {
    const axe = await axeViolations(page);
    check("axe dark: no serious/critical violations", axe.serious.length === 0, axe.serious.join(", "));
    check(
      "axe dark: over-map contrast requires visual inspection",
      true,
      `${axe.incompleteContrast} incomplete node(s)`,
    );
  });
  await attempt("map is keyboard-pannable", async () => {
    const canvas = page.locator("canvas.maplibregl-canvas").first();
    await canvas.click({ position: { x: 250, y: 250 }, force: true });
    const before = await canvas.screenshot();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(900);
    const after = await canvas.screenshot();
    check("map is keyboard-pannable", !before.equals(after));
  });

  await attempt("theme swaps in place", async () => {
    await page.evaluate(() => {
      window.__runAppNoReload = "sentinel";
      const toggle = document.querySelector('button[aria-label^="Switch to"]');
      if (!(toggle instanceof HTMLElement)) throw new Error("theme toggle not found");
      toggle.click();
    });
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"), {
      timeout: 10000,
    });
    await page.waitForTimeout(1800);
    check(
      "theme swaps in place",
      await page.evaluate(() => window.__runAppNoReload === "sentinel"),
    );
  });
  await attempt("capture light screenshot", async () => {
    await screenshot(page, "light");
    check("capture light screenshot", true);
  });
  await attempt("axe light", async () => {
    const axe = await axeViolations(page);
    check("axe light: no serious/critical violations", axe.serious.length === 0, axe.serious.join(", "));
  });

  await attempt("mobile layout", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const triggerLocator = page.getByRole("button", { name: /open market analysis/i });
    const zoomLocator = page.locator(".maplibregl-ctrl-top-left button").first();
    const trigger = (await triggerLocator.count()) > 0 ? await triggerLocator.boundingBox() : null;
    const zoom = (await zoomLocator.count()) > 0 ? await zoomLocator.boundingBox() : null;
    check("mobile drawer trigger visible", Boolean(trigger));
    check("mobile zoom control visible", Boolean(zoom));
    if (trigger && zoom) {
      const overlap =
        trigger.x < zoom.x + zoom.width &&
        trigger.x + trigger.width > zoom.x &&
        trigger.y < zoom.y + zoom.height &&
        trigger.y + trigger.height > zoom.y;
      check("mobile trigger and zoom controls do not overlap", !overlap);
    }
    await screenshot(page, "mobile");
    check("capture mobile screenshot", true);
  });

  await attempt("reduced-motion rendering", async () => {
    const reduced = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    reduced.setDefaultTimeout(5000);
    try {
      await reduced.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForScene(reduced);
      check(
        "reduced-motion rendering",
        (await reduced.locator("canvas.maplibregl-canvas").count()) > 0 &&
          !(await hasText(reduced, "Map unavailable")),
      );
    } finally {
      await reduced.close();
    }
  });

  await attempt("tile-failure fallback", async () => {
    const failedTiles = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await failedTiles.route("**tiles.openfreemap.org**", (route) => route.abort());
      await failedTiles.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const fallback = await failedTiles
        .getByText("Map unavailable")
        .waitFor({ timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      check("tile-failure fallback", fallback);
    } finally {
      await failedTiles.close();
    }
  });
} catch (error) {
  check("verifier completed", false, error instanceof Error ? error.message : String(error));
  if (page) await screenshot(page, "failure").catch(() => {});
} finally {
  await browser?.close().catch(() => {});
  const failed = results.filter((result) => !result.ok);
  const report = {
    city: CITY,
    url,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };
  writeFileSync(`${OUT}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${report.passed}/${results.length} checks passed`);
  console.log(`Report and screenshots: ${OUT}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}
