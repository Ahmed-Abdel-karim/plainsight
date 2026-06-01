import { chromium } from "playwright";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const CITY = process.argv[2] ?? "berlin";
const RUNS = Number(process.argv[3] ?? 4);
const browser = await chromium.launch({
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

for (let i = 1; i <= RUNS; i++) {
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) =>
    errs.push("PAGEERROR:\n" + (e.stack || e.message)),
  );
  page.on("console", (m) => {
    if (m.type() === "error") errs.push("CONSOLE.ERROR:\n" + m.text());
  });
  await page.goto(`${BASE_URL}/${CITY}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page
    .waitForSelector('div[aria-label^="Map of"]', { timeout: 30000 })
    .catch(() => {});
  await page
    .waitForFunction(() => !document.body.innerText.includes("Loading map"), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.waitForTimeout(1800);
  console.log(`\n===== RUN ${i} (${CITY}) — ${errs.length} error(s) =====`);
  if (errs.length) console.log(errs.join("\n----\n").slice(0, 4000));
  await page.close();
}
await browser.close();
