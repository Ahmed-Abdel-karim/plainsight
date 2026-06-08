import { chromium } from "playwright";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CITY = process.argv[2] ?? "amsterdam";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto(`${BASE_URL}/${CITY}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('div[aria-label^="Map of"]', { timeout: 30000 });
await page.waitForTimeout(3000);
const out = await page.evaluate(() => {
  const lines = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list, layer) => {
      for (const r of list) {
        if (r.cssRules && r.type === CSSRule.LAYER_BLOCK_RULE) {
          walk(r.cssRules, (r.name ? r.name : "<anon>"));
        } else if (r.cssRules && r.type === CSSRule.MEDIA_RULE) {
          walk(r.cssRules, layer);
        } else if (r.selectorText && /maplibregl-popup-content|maplibregl-popup-tip|hex-inspect/.test(r.selectorText)) {
          lines.push({ sheet: sheet.href ? sheet.href.split("/").pop() : "inline", layer: layer ?? "(none)", sel: r.selectorText, css: r.style.cssText.slice(0, 120) });
        }
      }
    };
    walk(rules, undefined);
  }
  return lines;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
