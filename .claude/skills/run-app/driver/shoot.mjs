// Browser-driven visual verification for the Plainsight scene (Next.js + MapLibre/WebGL).
// Connects to an already-running dev server, drives the real WebGL map, and writes
// dark / light / mobile PNGs plus a PASS/FAIL report. No GPU: Chromium runs with
// SwiftShader so WebGL works headless.
//
// Usage:  node shoot.mjs [city]
// Env:    BASE_URL (default http://localhost:3000)  OUT (default /tmp/plainsight-shots)

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CITY = process.argv[2] ?? "amsterdam";
const OUT = process.env.OUT ?? "/tmp/plainsight-shots";
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
};

// MapLibre needs a working WebGL context; SwiftShader gives us one without a GPU.
const browser = await chromium.launch({
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

async function waitForMapReady(page) {
  // The scene shows a "Loading map" placeholder until MapLibre's first idle.
  await page.waitForSelector('div[aria-label^="Map of"]', { timeout: 30000 });
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading map"), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500); // let tiles paint
}

// Run axe-core in the page and fail only on serious/critical violations. Note:
// axe can't compute contrast for chrome floating over the WebGL canvas, so it
// reports those as "incomplete" rather than pass/fail — surfaced as a note.
async function runAxe(page, label) {
  await page.addScriptTag({ path: AXE_PATH });
  const { violations, ccIncomplete } = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      resultTypes: ["violations", "incomplete"],
    });
    return {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact })),
      ccIncomplete: r.incomplete
        .filter((v) => v.id === "color-contrast")
        .reduce((n, v) => n + v.nodes.length, 0),
    };
  });
  const serious = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  check(
    `axe: no serious/critical a11y violations (${label})`,
    serious.length === 0,
    serious.map((v) => v.id).join(", "),
  );
  if (ccIncomplete > 0) {
    console.log(
      `   note(${label}): axe could not auto-verify contrast on ${ccIncomplete} over-map node(s); confirm legend/attribution AA by eye`,
    );
  }
}

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const url = `${BASE_URL}/${CITY}`;

  // Catch client-side runtime/hydration errors — the kind that don't show up in
  // SSR curls but break the live page.
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.split("\n")[0]));

  // ---- DARK (default) ----
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForMapReady(page);

  check(
    "no client runtime/hydration errors",
    pageErrors.length === 0,
    pageErrors[0] ?? "",
  );

  const htmlIsDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  check("dark is the default theme", htmlIsDark);

  const mapUnavailable = await page
    .getByText("Map unavailable")
    .count()
    .then((c) => c > 0);
  check("WebGL map rendered (no 'Map unavailable')", !mapUnavailable);

  const hasCanvas = await page.locator("canvas.maplibregl-canvas").count();
  check("MapLibre canvas present", hasCanvas > 0);

  const attribution = await page.locator(".maplibregl-ctrl-attrib").count();
  check("provider attribution control present (FR-015)", attribution > 0);

  const legend = await page
    .getByRole("complementary", { name: "Map legend" })
    .count();
  check("themed legend present (FR-012)", legend > 0);

  await page.screenshot({ path: `${OUT}/${CITY}-dark.png` });

  await runAxe(page, "dark");

  // ---- KEYBOARD PAN (FR/T008: map is keyboard-operable) ----
  const canvas = page.locator("canvas.maplibregl-canvas").first();
  await canvas.click({ position: { x: 250, y: 250 } }); // focus the map
  const beforePan = await canvas.screenshot();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(900);
  const afterPan = await canvas.screenshot();
  check(
    "map is keyboard-pannable (arrow keys move the map)",
    !beforePan.equals(afterPan),
  );

  // ---- LIGHT (in-place swap, must NOT reload) ----
  // Select the theme toggle by its stable prefix, not the full label (the label
  // text is itself subject to a next-themes hydration quirk). Assert the swap by
  // the <html> class flipping, which is the source of truth.
  await page.evaluate(() => {
    window.__noReload = "sentinel";
  });
  await page.locator('button[aria-label^="Switch to"]').first().click();
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("dark"),
    { timeout: 10000 },
  );
  await page.waitForTimeout(2000); // positron style + tiles swap in place
  const survived = await page.evaluate(() => window.__noReload === "sentinel");
  check("theme swap did NOT reload the page (FR-005)", survived);
  const stillCanvas = await page.locator("canvas.maplibregl-canvas").count();
  check("map still present after light swap", stillCanvas > 0);
  await page.screenshot({ path: `${OUT}/${CITY}-light.png` });

  await runAxe(page, "light");

  // ---- MOBILE (reflow, no control overlap) ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const trigger = await page
    .getByRole("button", { name: /open market analysis/i })
    .boundingBox();
  const zoomIn = await page
    .locator(".maplibregl-ctrl-top-left button")
    .first()
    .boundingBox();
  check("mobile drawer trigger visible", !!trigger);
  if (trigger && zoomIn) {
    const overlap =
      trigger.x < zoomIn.x + zoomIn.width &&
      trigger.x + trigger.width > zoomIn.x &&
      trigger.y < zoomIn.y + zoomIn.height &&
      trigger.y + trigger.height > zoomIn.y;
    check(
      "trigger and zoom controls do NOT overlap (CR-002)",
      !overlap,
      `trigger@${Math.round(trigger.y)} zoom@${Math.round(zoomIn.y)}`,
    );
  }
  await page.screenshot({ path: `${OUT}/${CITY}-mobile.png` });

  // ---- REDUCED MOTION (FR-010): still renders, no crash ----
  const rmPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await rmPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForMapReady(rmPage);
  const rmCanvas = await rmPage.locator("canvas.maplibregl-canvas").count();
  const rmBroken = await rmPage.getByText("Map unavailable").count();
  check(
    "renders under prefers-reduced-motion (FR-010)",
    rmCanvas > 0 && rmBroken === 0,
  );
  await rmPage.close();

  // ---- TILE FAILURE (FR-011): quiet themed fallback, not a blank region ----
  const errPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await errPage.route("**tiles.openfreemap.org**", (r) => r.abort());
  await errPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  const fellBack = await errPage
    .getByText("Map unavailable")
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check("shows 'Map unavailable' fallback when tiles fail (FR-011)", fellBack);
  await errPage.close();

  console.log(`\nScreenshots written to ${OUT}/`);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length ? 1 : 0);
