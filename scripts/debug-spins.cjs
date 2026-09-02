const { chromium } = require('playwright');
const fs = require('fs');

const SYM_NAMES = { 1: 'LOW_1', 2: 'LOW_2', 3: 'LOW_3', 4: 'LOW_4', 5: 'HIGH_1', 6: 'HIGH_2', 7: 'HIGH_3', 8: 'HIGH_4', 12: 'FS', 21: 'WILD_X1', 22: 'WILD_X2', 23: 'WILD_X3', 24: 'WILD_X4', 25: 'WILD_X5', 26: 'WILD_X6', 27: 'WILD_X7', 28: 'WILD_X8', 29: 'WILD_X9', 30: 'WILD_X10' };

function decodeGrid(gridStr) {
  const w = gridStr.charCodeAt(0) - 40;
  const h = gridStr.charCodeAt(1) - 40;
  const body = gridStr.slice(2);
  const board = [];
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      const id = body.charCodeAt(r * w + c) - 40;
      row.push({ id, name: SYM_NAMES[id] || `?${id}` });
    }
    board.push(row);
  }
  return { w, h, board };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await ctx.newPage();
  
  let sessionUuid = null;
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/authenticate') && resp.status() === 200) {
      const body = await resp.json().catch(() => ({}));
      if (body.sessionUuid) sessionUuid = body.sessionUuid;
    }
  });
  
  // Log ALL /play/bet requests and responses
  let betCounter = 0;
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet')) {
      betCounter++;
      const num = betCounter;
      let info = `[B${num}] ${resp.request().method()} ${resp.status()} ${resp.url().slice(-30)}`;
      if (resp.status() === 200) {
        try {
          const body = await resp.json();
          const events = body.round?.events || [];
          info += ` events=${events.length} status=${body.round?.status || '?'} win=${events[events.length-1]?.awa || 0}`;
        } catch (e) {}
      }
      console.log(info);
    }
  });
  
  console.log('Booting...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(35000);
  
  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) gameFrame = f;
  }
  if (!gameFrame || !sessionUuid) { console.log('Boot fail'); process.exit(1); }
  console.log('Booted, session:', sessionUuid.slice(0, 8));
  
  await gameFrame.waitForSelector('canvas');
  await gameFrame.waitForTimeout(12000);
  const cv = await gameFrame.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(2500);
  await gameFrame.focus('canvas');
  await page.waitForTimeout(500);
  
  console.log('Starting 5 spins...');
  for (let i = 0; i < 5; i++) {
    console.log(`\n--- Spin ${i} ---`);
    const pressPromise = page.keyboard.press('Space');
    const respPromise = page.waitForResponse(
      r => r.url().includes('/play/bet') && r.status() === 200,
      { timeout: 8000 }
    );
    await pressPromise;
    try {
      const resp = await respPromise;
      const body = await resp.json();
      const events = body.round?.events || [];
      console.log(`  → got ${events.length} events, status=${body.round?.status}, win=${events[events.length-1]?.awa || 0}`);
    } catch (e) {
      console.log(`  → TIMEOUT: ${e.message.slice(0, 100)}`);
    }
    await page.waitForTimeout(3500);
  }
  
  console.log('\nDone.');
  await browser.close();
})();
