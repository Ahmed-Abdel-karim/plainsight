// Hex-inspect tooltip visual check (Analyse lens). Hovers a hex, screenshots the
// tooltip, and dumps the computed chrome styles so we can see if the popup
// defaults leak through.  node hex-shot.mjs [city]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CITY = process.argv[2] ?? "amsterdam";
const OUT = process.env.OUT ?? "/tmp/plainsight-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.on("pageerror", (e) => console.log("PAGEERROR", String(e)));

await page.goto(`${BASE_URL}/${CITY}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('div[aria-label^="Map of"]', { timeout: 30000 });
await page
  .waitForFunction(() => !document.body.innerText.includes("Loading map"), {
    timeout: 30000,
  })
  .catch(() => {});
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2500); // let hexes paint

// Sweep the mouse across the map to land on a hex and fire the layer mousemove.
const box = await page.locator('div[aria-label^="Map of"]').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
let found = false;
outer: for (let dx = 0; dx <= 240 && !found; dx += 30) {
  for (const sx of [cx + dx, cx - dx]) {
    for (let dy = 0; dy <= 200; dy += 40) {
      for (const sy of [cy + dy, cy - dy]) {
        await page.mouse.move(sx, sy);
        await page.waitForTimeout(60);
        if (await page.locator(".hex-inspect-popup").count()) {
          found = true;
          break outer;
        }
      }
    }
  }
}
await page.waitForTimeout(300);

console.log("tooltip visible:", found);
if (found) {
  const info = await page.evaluate(() => {
    const pick = (el, props) =>
      el
        ? Object.fromEntries(
            props.map((p) => [p, getComputedStyle(el).getPropertyValue(p)]),
          )
        : null;
    const popup = document.querySelector(".hex-inspect-popup");
    const content = document.querySelector(
      ".hex-inspect-popup .maplibregl-popup-content",
    );
    const tip = document.querySelector(".hex-inspect-popup .maplibregl-popup-tip");
    const chrome = document.querySelector(".hex-inspect-popup .map-chrome");
    return {
      popupHTML: popup?.outerHTML.slice(0, 400),
      content: pick(content, [
        "background-color",
        "padding",
        "border-radius",
        "box-shadow",
        "max-width",
        "width",
      ]),
      tip: pick(tip, ["display", "border-right-color"]),
      chrome: pick(chrome, [
        "background-color",
        "backdrop-filter",
        "-webkit-backdrop-filter",
        "border",
        "border-radius",
        "box-shadow",
        "color",
      ]),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // Tight crop around the tooltip for inspection.
  const tip = await page.locator(".hex-inspect-popup").boundingBox();
  if (tip) {
    await page.screenshot({
      path: `${OUT}/${CITY}-hex-tooltip.png`,
      clip: {
        x: Math.max(0, tip.x - 40),
        y: Math.max(0, tip.y - 40),
        width: tip.width + 220,
        height: tip.height + 120,
      },
    });
  }
}
await page.screenshot({ path: `${OUT}/${CITY}-hex-full.png` });
console.log("shots in", OUT);
await browser.close();
