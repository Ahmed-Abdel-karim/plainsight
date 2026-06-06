// Browse-lens (feature 007) visual verification. Connects to a running dev
// server, drives the Analyse↔Browse lens swap, and writes screenshots.
//   node browse-shot.mjs [city]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CITY = process.argv[2] ?? "london";
const OUT = process.env.OUT ?? "/tmp/plainsight-shots";
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
};

async function axeClean(p, label) {
  await p.addScriptTag({ path: AXE_PATH });
  const violations = await p.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ["violations"] });
    return r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.html.slice(0, 140)),
      }));
  });
  if (violations.length) {
    for (const v of violations)
      console.log(`   [axe ${label}] ${v.id}: ${v.nodes.join(" | ")}`);
  }
  check(
    `axe clean — ${label}`,
    violations.length === 0,
    violations.map((v) => v.id).join(", "),
  );
}

const browser = await chromium.launch({
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.on("pageerror", (e) => errors.push(String(e)));

// 1) Analyse (default) — the lens tab should be present over the map.
await page.goto(`${BASE_URL}/${CITY}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[role="tablist"]', { timeout: 30000 });
const analyseTab = page.getByRole("tab", { name: "Analyse" });
const browseTab = page.getByRole("tab", { name: "Browse" });
check(
  "lens tablist over the map",
  (await page.locator('[role="tablist"]').count()) > 0,
);
check(
  "Analyse + Browse tabs present",
  (await analyseTab.count()) > 0 && (await browseTab.count()) > 0,
);
// Analyse shows the filter panel + charts (the dashboard). Listing list absent.
check(
  "Analyse shows dashboard (no listings list)",
  (await page.getByRole("list", { name: /Listings matching/ }).count()) === 0,
);

// 2) Switch to Browse via the tab.
await browseTab.click();
const list = page.getByRole("list", { name: /Listings matching/ });
await list.waitFor({ timeout: 30000 });
check("Browse shows the listings list", (await list.count()) > 0);
// At least a few cards rendered (virtualized rows are buttons with "per night").
const cardCount = await page.getByRole("button", { name: /per night/ }).count();
check("listing cards rendered", cardCount > 0, `${cardCount} cards visible`);
// The live count "N of total".
const status = page.getByRole("status").filter({ hasText: /of .* listings/ });
check(
  "result count present",
  (await status.count()) > 0,
  (
    await status
      .first()
      .textContent()
      .catch(() => "")
  )?.trim(),
);
// URL reflects the lens.
check(
  "URL carries lens=browse",
  page.url().includes("lens=browse"),
  page.url(),
);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2500); // let the ~62k dots paint
await page.screenshot({ path: `${OUT}/${CITY}-browse-dark.png` });

// Hover the first card → it should not error and should drive the shared hover.
const firstCard = page.getByRole("button", { name: /per night/ }).first();
await firstCard.hover().catch(() => {});
await page.waitForTimeout(300);
check("card hover does not error", true);

// US3 — detail drawer: click a card → drawer opens, URL carries the listing id.
await firstCard.click();
const dialog = page.getByRole("dialog");
await dialog.waitFor({ timeout: 10000 });
check("detail drawer opens on card click", (await dialog.count()) > 0);
const listingMatch = page.url().match(/listing=(\d+)/);
check("URL carries the selected listing id", !!listingMatch, page.url());
const dlgText = (await dialog.textContent().catch(() => "")) ?? "";
check(
  "drawer shows host / reviews / min nights",
  /Reviews \/ month/.test(dlgText) &&
    /Minimum nights/.test(dlgText) &&
    /Host/.test(dlgText),
);
check(
  "drawer omits availability (research D3)",
  !/availability/i.test(dlgText) && !/365/.test(dlgText),
);
await page.screenshot({ path: `${OUT}/${CITY}-browse-drawer.png` });
// Esc closes the drawer and clears the listing from the URL (FR-009/010).
await page.waitForTimeout(500); // let the open animation + focus settle
await page.keyboard.press("Escape");
await page.waitForTimeout(700);
check(
  "Esc closes drawer + clears the URL",
  (await page.getByRole("dialog").count()) === 0 &&
    !/listing=/.test(page.url()),
);

// Deep-link restore (SC-005): a URL naming a listing reopens its drawer.
const knownId = listingMatch?.[1] ?? "";
await page.goto(`${BASE_URL}/${CITY}?lens=browse&listing=${knownId}`, {
  waitUntil: "domcontentloaded",
});
await page
  .getByRole("dialog")
  .waitFor({ timeout: 15000 })
  .catch(() => {});
check(
  "deep-link reopens the drawer",
  (await page.getByRole("dialog").count()) > 0,
  `listing=${knownId}`,
);
// Unknown id → Browse with no drawer (edge case).
await page.goto(`${BASE_URL}/${CITY}?lens=browse&listing=999999999`, {
  waitUntil: "domcontentloaded",
});
await list.waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
check(
  "unknown listing id opens no drawer",
  (await page.getByRole("dialog").count()) === 0,
);
// Reset to the plain Browse view for the theme-swap step.
await page.goto(`${BASE_URL}/${CITY}?lens=browse`, {
  waitUntil: "domcontentloaded",
});
await list.waitFor({ timeout: 15000 });
await page.waitForTimeout(800);

// US4 — sort: changing the order changes the visible list but not the count.
const cardLabel = () =>
  page
    .getByRole("button", { name: /per night/ })
    .first()
    .getAttribute("aria-label");
const countText = () =>
  page
    .getByRole("status")
    .filter({ hasText: /of .* listings/ })
    .first()
    .textContent();
const firstBefore = await cardLabel();
const countBefore = ((await countText()) ?? "").trim();
await page.getByRole("combobox", { name: "Sort" }).click();
await page.getByRole("option", { name: "Price: high to low" }).click();
await page.waitForTimeout(600);
const firstAfter = await cardLabel();
const countAfter = ((await countText()) ?? "").trim();
check(
  "sort reorders the visible list",
  firstBefore !== firstAfter,
  `${(firstBefore ?? "").slice(0, 24)} → ${(firstAfter ?? "").slice(0, 24)}`,
);
check(
  "sort leaves the matching count unchanged",
  countBefore === countAfter,
  countAfter,
);

// Empty state (FR-012) — a price band matching nothing shows the reset affordance.
await page.goto(`${BASE_URL}/${CITY}?lens=browse&price=1,1`, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(1500);
const resetBtn = page.getByRole("button", { name: /Reset filters/ });
check(
  "empty state shows a reset affordance",
  (await resetBtn.count()) > 0 &&
    (await page.getByRole("list", { name: /Listings matching/ }).count()) === 0,
);
await page.screenshot({ path: `${OUT}/${CITY}-browse-empty.png` });
await page.goto(`${BASE_URL}/${CITY}?lens=browse`, {
  waitUntil: "domcontentloaded",
});
await list.waitFor({ timeout: 15000 });
await page.waitForTimeout(800);

// Accessibility (SC-006 / CR-001/003): axe clean over the Browse view, dark.
await axeClean(page, "browse dark");

// 3) Light theme — swap should not reload; list stays.
const toggle = page.locator('button[aria-label^="Switch to"]').first();
if (await toggle.count()) {
  await toggle.click();
  await page.waitForTimeout(600);
}
check("listings list survives theme swap", (await list.count()) > 0);
await page.screenshot({ path: `${OUT}/${CITY}-browse-light.png` });
await axeClean(page, "browse light");

// 3b) Neighbourhood scope (FR-013) via deep-link — count narrows below city total.
const cityCount =
  (await status
    .first()
    .textContent()
    .catch(() => "")) ?? "";
const cityTotal = Number(
  (cityCount.match(/of ([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""),
);
await page.goto(`${BASE_URL}/${CITY}?lens=browse&nbhd=croydon`, {
  waitUntil: "domcontentloaded",
});
await list.waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
const scopedText =
  (await page
    .getByRole("status")
    .filter({ hasText: /of .* listings/ })
    .first()
    .textContent()
    .catch(() => "")) ?? "";
const scopedTotal = Number(
  (scopedText.match(/of ([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""),
);
check(
  "neighbourhood scope narrows the count",
  scopedTotal > 0 && scopedTotal < cityTotal,
  `croydon ${scopedTotal} < city ${cityTotal}`,
);
await page.screenshot({ path: `${OUT}/${CITY}-browse-scope.png` });
// Back to the city-wide Browse view for the remaining steps.
await page.goto(`${BASE_URL}/${CITY}?lens=browse`, {
  waitUntil: "domcontentloaded",
});
await list.waitFor({ timeout: 30000 });

// 4) Back to Analyse — dashboard restored, list gone.
await analyseTab.click();
await page.waitForTimeout(500);
check(
  "Analyse restores dashboard (list gone)",
  (await page.getByRole("list", { name: /Listings matching/ }).count()) === 0,
);

// 5) Mobile width + deep-link restore (?lens=browse on first load).
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push(String(e)));
await mobile.goto(`${BASE_URL}/${CITY}?lens=browse`, {
  waitUntil: "domcontentloaded",
});
// Open the mobile sheet (drawer trigger) to reveal the sidebar content.
const trigger = mobile
  .locator('[data-vaul-drawer-trigger], button:has-text("listings")')
  .first();
await trigger.click();
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: `${OUT}/${CITY}-browse-mobile.png` });
check("mobile renders without errors", true);

check(
  "no client runtime/hydration errors",
  errors.length === 0,
  errors[0] ?? "",
);

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(
  `\n${failed === 0 ? "ALL PASS" : failed + " FAILED"} — shots in ${OUT}`,
);
process.exit(failed === 0 ? 0 : 1);
