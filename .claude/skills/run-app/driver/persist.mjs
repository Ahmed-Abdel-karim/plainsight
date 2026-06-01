// Persistence check: prove the MapLibre map is mounted ONCE in the (scene) layout
// and survives client-side navigation between cities (no remount, no "Loading map"
// flash). Tags the live canvas with a JS probe, soft-navigates via the city
// switcher, and asserts the same DOM node is still there afterwards.
//
// Usage:  node persist.mjs [fromCity] [toCity]
// Env:    BASE_URL (default http://localhost:3000)

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const FROM = process.argv[2] ?? "amsterdam";
const TO = process.argv[3] ?? "berlin";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ ok });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
};

const browser = await chromium.launch({
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

async function waitForMap(page, name) {
  await page.waitForSelector(`div[aria-label="Map of ${name}"]`, {
    timeout: 30000,
  });
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading map"), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}

const readLegend = (page) =>
  page
    .locator('aside[aria-label="Map legend"]')
    .innerText()
    .then((t) => t.replace(/\s+/g, " ").trim());

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
  // --- Load the first city and tag the live canvas + a window sentinel. ---
  await page.goto(`${BASE_URL}/${FROM}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await waitForMap(page, "Amsterdam");

  const fromLabelName = await page
    .locator('div[aria-label^="Map of"]')
    .getAttribute("aria-label");
  const fromLegend = await readLegend(page);

  const tagged = await page.evaluate(() => {
    const canvas = document.querySelector("canvas.maplibregl-canvas");
    if (!canvas) return false;
    canvas.__persistProbe = "PERSIST-OK";
    window.__noReload = "sentinel";
    return true;
  });
  check("tagged the live MapLibre canvas before navigating", tagged);

  // --- Soft-navigate to the second city via the city switcher dropdown. ---
  await page
    .locator(`button:has-text("${cap(FROM)}")`)
    .first()
    .click();
  await page.locator(`a[href="/${TO}"]`).click();

  // Wait for the scene to reflect the new city.
  await page.waitForSelector(`div[aria-label="Map of ${cap(TO)}"]`, {
    timeout: 30000,
  });
  await page.waitForTimeout(1500); // allow flyTo + GeoJSON swap to settle

  const toLabelName = await page
    .locator('div[aria-label^="Map of"]')
    .getAttribute("aria-label");
  const toLegend = await readLegend(page);

  // --- The decisive checks. ---
  const probe = await page.evaluate(() => {
    const canvas = document.querySelector("canvas.maplibregl-canvas");
    return {
      survived: canvas?.__persistProbe === "PERSIST-OK",
      noReload: window.__noReload === "sentinel",
      loadingVisible: document.body.innerText.includes("Loading map"),
    };
  });

  check("client-side navigation (no full page reload)", probe.noReload);
  check(
    "SAME canvas node survived navigation (map did NOT remount)",
    probe.survived,
  );
  check("no 'Loading map' flash on the second city", !probe.loadingVisible);
  check(
    "map aria-label updated to the new city",
    fromLabelName === `Map of ${cap(FROM)}` &&
      toLabelName === `Map of ${cap(TO)}`,
    `${fromLabelName} → ${toLabelName}`,
  );
  check(
    "legend neighbourhood count updated for the new city",
    fromLegend !== toLegend,
    `"${fromLegend}" → "${toLegend}"`,
  );
  check(
    "no client runtime/hydration errors",
    errors.length === 0,
    errors[0] ?? "",
  );
} catch (e) {
  check("persistence run completed without throwing", false, String(e));
} finally {
  await browser.close();
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
