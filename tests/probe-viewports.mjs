import { chromium } from 'playwright';

const viewports = [
  { w: 360, h: 800, name: 'galaxy-s22' },
  { w: 412, h: 915, name: 'galaxy-note' },
  { w: 390, h: 844, name: 'iphone-13' },
  { w: 375, h: 667, name: 'iphone-se' },
];

const browser = await chromium.launch({ args: ['--no-sandbox'] });

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8091/?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#game canvas', { timeout: 20000 });
  await page.waitForTimeout(7000);
  const canvas = await page.$('#game canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(3000);
  
  const state = await page.evaluate(() => {
    const game = window.__SHOGUN_GAME__;
    if (!game) return { error: 'no game' };
    const s = game.scene.scenes.find(s => s.menuButton);
    if (!s) return { error: 'no menuButton' };
    return {
      width: game.scale.width,
      height: game.scale.height,
      menuContainer: { x: s.menuButton.x, y: s.menuButton.y },
      bg: s.menuButtonBg.getBounds(),
      scaleFactor: s.scaleFactor,
      frameH: s.frameH,
      frameW: s.frameW,
    };
  });
  
  // Full screen
  await page.screenshot({
    path: `/home/llama-claw/.openclaw/agents/kira-forge/workspace/_full-${vp.name}.png`,
  });
  
  // Capture just the hamburger area, clamp to viewport
  const x = Math.max(0, Math.floor(state.bg.x - 5));
  const y = Math.max(0, Math.floor(state.bg.y - 5));
  const w = Math.max(1, Math.min(vp.w - x, Math.ceil(state.bg.width + 10)));
  const h = Math.max(1, Math.min(vp.h - y, Math.ceil(state.bg.height + 10)));
  if (w > 0 && h > 0 && x < vp.w && y < vp.h) {
    try {
      await page.screenshot({
        path: `/home/llama-claw/.openclaw/agents/kira-forge/workspace/_probe-${vp.name}.png`,
        clip: { x, y, width: w, height: h },
      });
    } catch (e) {
      console.log(`  crop failed for ${vp.name}: ${e.message}`);
    }
  }
  
  const bgLeftEdge = state.bg.x;
  const bgRightEdge = state.bg.x + state.bg.width;
  const leftClip = bgLeftEdge < 0 ? Math.abs(bgLeftEdge) : 0;
  const rightClip = bgRightEdge > vp.w ? (bgRightEdge - vp.w) : 0;
  console.log(`${vp.name} (${vp.w}x${vp.h}): bg=(${state.bg.x.toFixed(1)},${state.bg.y.toFixed(1)}) ${state.bg.width}x${state.bg.height} clipL=${leftClip.toFixed(1)} clipR=${rightClip.toFixed(1)} sf=${state.scaleFactor?.toFixed(3)} frameH=${state.frameH?.toFixed(0)}`);
  
  await ctx.close();
}
await browser.close();
