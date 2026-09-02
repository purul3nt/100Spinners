// One-shot Playwright capture for the 1000 Shogun Spinners mobile portrait HUD.
// Purpose: visually verify the hamburger menu foreground is centered inside
// its rectangle background after the 20260621-1927 anchoring fix.
//
// Usage:  node tests/capture-hamburger-fix.mjs [outName] [viewportW] [viewportH]
// Default: test-results/hamburger-fix-kira-390x844.png @ 390x844

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outName = process.argv[2] || "hamburger-fix-kira-390x844.png";
const vw = Number(process.argv[3] || 390);
const vh = Number(process.argv[4] || 844);
const url = process.env.SHOT_URL || "http://127.0.0.1:8091/";
const outPath = path.join(root, "test-results", outName);

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({
  viewport: { width: vw, height: vh },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push("console.error: " + msg.text());
});

await page.goto(url, { waitUntil: "load", timeout: 30000 });

// Wait for Phaser to mount a canvas inside #game, then give the loading +
// splash + slot scenes enough time to settle into the idle HUD.
await page.waitForSelector("#game canvas", { timeout: 20000 });
await page.waitForTimeout(7000);

// SplashScene clickZone dismisses on any pointerdown. Click center to dismiss.
const canvas = await page.$("#game canvas");
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(2500);

await page.screenshot({ path: outPath, fullPage: false });

console.log(JSON.stringify({
  ok: true,
  url,
  viewport: { w: vw, h: vh },
  output: outPath,
  consoleErrors,
}, null, 2));

await ctx.close();
await browser.close();
