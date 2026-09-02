import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  bypassCSP: true,
});
const page = await ctx.newPage();
// Disable cache
await ctx.route('**/*', (route) => {
  const headers = { ...route.request().headers() };
  headers['cache-control'] = 'no-cache';
  headers['pragma'] = 'no-cache';
  route.continue({ headers });
});
await page.goto('http://127.0.0.1:8091/?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('#game canvas', { timeout: 20000 });
await page.waitForTimeout(8000);
const canvas = await page.$('#game canvas');
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(3000);

// Capture full screen
await page.screenshot({ path: '/home/llama-claw/.openclaw/agents/kira-forge/workspace/_verify-full.png' });
// Capture just hamburger area
await page.screenshot({ path: '/home/llama-claw/.openclaw/agents/kira-forge/workspace/_verify-hamburger.png', clip: { x: 0, y: 728, width: 80, height: 80 } });

// Get Phaser state
const state = await page.evaluate(() => {
  const game = window.__SHOGUN_GAME__;
  if (!game) return { error: 'No game found' };
  const s = game.scene.scenes.find(s => s.menuButton);
  if (!s) return { error: 'No menuButton' };
  return {
    width: game.scale.width,
    height: game.scale.height,
    container: { x: s.menuButton.x, y: s.menuButton.y, scale: s.menuButton.scaleX },
    bg: s.menuButtonBg.getBounds(),
    bgFillColor: s.menuButtonBg.fillColor,
    bgWidth: s.menuButtonBg.width,
    bgHeight: s.menuButtonBg.height,
    bars: s.menuButton.list.slice(1).map(b => b.getBounds()),
    rawMenuSize: window.__MENU_SIZE_DEBUG__ || 'n/a',
  };
});
console.log(JSON.stringify(state, null, 2));
await ctx.close();
await browser.close();
