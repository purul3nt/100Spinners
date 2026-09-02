import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8091/?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('#game canvas', { timeout: 20000 });
await page.waitForTimeout(5000);
const canvas = await page.$('#game canvas');
const box = await canvas.boundingBox();
console.log('CSS canvas box:', box);
const state = await page.evaluate(() => {
  const game = window.__SHOGUN_GAME__;
  return { canvasW: game.scale.canvas.width, canvasH: game.scale.canvas.height, scaleW: game.scale.width, scaleH: game.scale.height, displayW: game.scale.displaySize.width, displayH: game.scale.displaySize.height };
});
console.log('Phaser state:', state);
await browser.close();
