#!/usr/bin/env node
// Final visual verification of the mobile portrait layout + hamburger fix.
// Captures the full UI at all common portrait viewports and dumps the
// Phaser introspection state for each (machine %, bar margins, scale factor).

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const PORT = 8091;
const OUT_DIR = "test-results";

const VIEWPORTS = [
  { w: 360, h: 800, label: "360x800-galaxy-s22" },
  { w: 375, h: 667, label: "375x667-iphone-se" },
  { w: 390, h: 844, label: "390x844-iphone-13" },
  { w: 412, h: 915, label: "412x915-galaxy-note" },
];

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
console.log(`Capturing against http://127.0.0.1:${PORT}/`);
console.log();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`http://127.0.0.1:${PORT}/?nocache=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForSelector("#game canvas", { timeout: 20000 });
  await page.waitForTimeout(6000);

  // Dismiss splash
  const canvas = await page.$("#game canvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(2500);

  // Capture full UI
  const fullPath = `${OUT_DIR}/final-full-${vp.label}.png`;
  await page.screenshot({ path: fullPath, fullPage: false });

  // Phaser state introspection
  const state = await page.evaluate(() => {
    const game = window.__SHOGUN_GAME__;
    if (!game) return { error: "no game" };
    const s = game.scene.scenes.find((s) => s.menuButton);
    if (!s) return { error: "no scene" };
    const bg = s.menuButtonBg.getBounds();
    const bar0 = s.menuButton.list[1].getBounds();
    const m = s.getMachineFrameBounds
      ? s.getMachineFrameBounds(game.scale.width, game.scale.height)
      : null;
    return {
      width: game.scale.width,
      height: game.scale.height,
      scaleFactor: s.scaleFactor,
      frameH: s.frameH,
      frameW: s.frameW,
      bg: { x: bg.x, y: bg.y, w: bg.width, h: bg.height },
      bar0: { x: bar0.x, y: bar0.y, w: bar0.width, h: bar0.height },
      machine: m,
      margins: {
        left: bar0.x - bg.x,
        right: bg.x + bg.width - (bar0.x + bar0.width),
        top: bar0.y - bg.y,
        bottom: bg.y + bg.height - (bar0.y + bar0.height),
      },
    };
  });

  const hPct = state.frameH ? (state.frameH / vp.h) * 100 : 0;
  const m = state.margins || {};
  const absLR = Math.abs((m.left || 0) - (m.right || 0));
  const absTB = Math.abs((m.top || 0) - (m.bottom || 0));

  console.log(
    `${vp.label}: scaleFactor=${state.scaleFactor?.toFixed(3)}, ` +
      `frameH=${state.frameH?.toFixed(0)} (${hPct.toFixed(1)}% of viewport), ` +
      `bg=(${state.bg?.x.toFixed(0)},${state.bg?.y.toFixed(0)}) ${state.bg?.w}x${state.bg?.h}, ` +
      `margins L=${m.left?.toFixed(2)} R=${m.right?.toFixed(2)} T=${m.top?.toFixed(2)} B=${m.bottom?.toFixed(2)} ` +
      `(|L-R|=${absLR.toFixed(2)} |T-B|=${absTB.toFixed(2)}), ` +
      `errors=${errors.length}`
  );

  await ctx.close();
}

await browser.close();
console.log();
console.log("Done.");
