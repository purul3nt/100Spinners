import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8091/?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('#game canvas', { timeout: 20000 });
await page.waitForTimeout(7000);
const canvas = await page.$('#game canvas');
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const game = window.__SHOGUN_GAME__;
  if (!game) return { error: 'no game' };
  const s = game.scene.scenes.find(s => s.menuButton);
  if (!s) return { error: 'no scene' };
  
  const w = game.scale.width;
  const h = game.scale.height;
  const i = h > 1.05 * w;
  const sScale = s.getMachineImageScale(w, h);
  const A = 118*4 + 96;
  const C = A * (1376/768);
  const r = (i ? 0.985*w : 0.94*w) / (C * sScale);
  const o = h * (i ? 0.46 : 0.62);
  const expectedScaleFactor = Math.min(1, r, o / A);
  
  return {
    viewport: `${w}x${h}`,
    isPortrait: i,
    isMobileReported: game.device && game.device.os ? game.device.os : 'unknown',
    isMobile: game.device && game.device.desktop !== undefined ? !game.device.desktop : '?',
    sScale,
    A, C,
    r: r.toFixed(4),
    o: o.toFixed(2),
    o_div_A: (o/A).toFixed(4),
    expectedScaleFactor: expectedScaleFactor.toFixed(4),
    actualScaleFactor: s.scaleFactor?.toFixed(4),
    menuX: s.menuButton.x.toFixed(2),
    menuY: s.menuButton.y.toFixed(2),
    bg: s.menuButtonBg.getBounds(),
    bg_fillColor: s.menuButtonBg.fillColor,
    canvas: {
      width: game.scale.width,
      height: game.scale.height,
      displayWidth: game.canvas ? game.canvas.width : 'no canvas',
      displayHeight: game.canvas ? game.canvas.height : 'no canvas',
    },
  };
});
console.log(JSON.stringify(result, null, 2));
await ctx.close();
await browser.close();
