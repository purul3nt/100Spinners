const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let browser, ctx, page;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await ctx.addCookies([
      { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
      { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
    ]);
    page = await ctx.newPage();
    
    let sessionUuid = null;
    let betCounter = 0;
    page.on('response', async (resp) => {
      try {
        if (resp.url().includes('/play/authenticate') && resp.status() === 200) {
          const body = await resp.json();
          if (body.sessionUuid) sessionUuid = body.sessionUuid;
        }
        if (resp.url().includes('/play/bet')) {
          betCounter++;
          const num = betCounter;
          let info = `[${num}] ${resp.request().method()} ${resp.status()}`;
          if (resp.status() === 200) {
            const body = await resp.json().catch(() => null);
            if (body && body.round) {
              const events = body.round.events || [];
              const lastEv = events[events.length - 1] || {};
              info += ` events=${events.length} status=${body.round.status} etn=${events.map(e=>e.etn).join(',')} lastAwa=${lastEv.awa || 0}`;
            }
          }
          console.log(info);
        }
      } catch (e) {}
    });
    
    console.log('Booting...');
    await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(8000);
    await page.click('span.js-launch-game', { force: true, timeout: 5000 }).catch(e => console.log('Click fail:', e.message));
    await page.waitForTimeout(40000);
    
    let gameFrame = null;
    for (const f of page.frames()) {
      if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) gameFrame = f;
    }
    if (!gameFrame || !sessionUuid) { console.log('Boot fail - no frame or session'); return; }
    console.log('Booted, session:', sessionUuid.slice(0, 8));
    
    await gameFrame.waitForSelector('canvas', { timeout: 30000 });
    await gameFrame.waitForTimeout(15000);
    const cv = await gameFrame.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
    await gameFrame.waitForTimeout(3000);
    await gameFrame.focus('canvas');
    await page.waitForTimeout(1000);
    
    console.log('Starting 5 spins, 6s between...');
    for (let i = 0; i < 5; i++) {
      console.log(`\n--- Spin ${i} ---`);
      const t0 = Date.now();
      const pressPromise = page.keyboard.press('Space');
      const respPromise = page.waitForResponse(
        r => r.url().includes('/play/bet') && r.status() === 200,
        { timeout: 10000 }
      );
      await pressPromise;
      try {
        const resp = await respPromise;
        const body = await resp.json();
        const events = body.round?.events || [];
        console.log(`  ✓ got ${events.length} events in ${Date.now()-t0}ms, status=${body.round?.status}`);
      } catch (e) {
        console.log(`  ✗ TIMEOUT after ${Date.now()-t0}ms`);
      }
      await page.waitForTimeout(6000);
    }
    
    console.log('\nDone.');
  } catch (e) {
    console.log('FATAL:', e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
