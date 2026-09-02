// Higher-res zoomed capture focused on the bottom-left hamburger icon.
// Captures both the full game and a 2x crop centered on the icon.

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outName = process.argv[2] || "hamburger-fix-kira-zoom-390x844.png";
const cropOut = process.argv[3] || "hamburger-fix-kira-zoom-crop.png";
const vw = Number(process.argv[4] || 390);
const vh = Number(process.argv[5] || 844);
const url = process.env.SHOT_URL || "http://127.0.0.1:8092/";
const outPath = path.join(root, "test-results", outName);
const cropPath = path.join(root, "test-results", cropOut);

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({
  viewport: { width: vw, height: vh },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

page.on("pageerror", (e) => console.error("pageerror:", e.message));

await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForSelector("#game canvas", { timeout: 20000 });
await page.waitForTimeout(7000);

// Click center to dismiss the splash
const canvas = await page.$("#game canvas");
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(2500);

// Capture full frame
await page.screenshot({ path: outPath, fullPage: false });

// Crop the bottom-left hamburger area. menuButton is at width*0.098 in x;
// menuSize=130 in portrait. Account for DSR=2.
await page.screenshot({
  path: cropPath,
  clip: { x: 0, y: vh - 200, width: 200, height: 200 },
});

console.log(JSON.stringify({
  ok: true,
  url,
  viewport: { w: vw, h: vh },
  output: outPath,
  crop: cropPath,
}, null, 2));

await ctx.close();
await browser.close();
