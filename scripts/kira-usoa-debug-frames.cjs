const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1707, height: 960 } });
  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await context.newPage();
  
  let betCount = 0;
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/play/bet')) {
      betCount++;
      try {
        const body = await resp.text();
        const j = JSON.parse(body);
        if (j.round) {
          console.log(`  BET #${betCount}: statusCode=${j.statusCode}, events=${j.round.events?.length || 0}, awa=${j.round.events?.[0]?.awa || 0}`);
        }
      } catch(e) {}
    }
  });
  
  console.log('Navigating...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await (await page.$('span.js-launch-game')).click();
  console.log('Clicked, waiting 40s...');
  await page.waitForTimeout(40000);
  
  // Check frames via page.frames()
  const frames = page.frames();
  console.log(`Frames found: ${frames.length}`);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    console.log(`Frame ${i}: ${f.url().slice(0, 80)}`);
    try {
      const canvasCount = await f.evaluate(() => document.querySelectorAll('canvas').length);
      console.log(`  canvases: ${canvasCount}`);
      if (canvasCount > 0) {
        // This is our game frame
        console.log(`  Found game frame!`);
        // Try keyboard
        console.log('  Pressing space...');
        await f.evaluate(() => window.focus());
        await page.keyboard.press('Space');
        await page.waitForTimeout(8000);
        console.log(`  Bets seen: ${betCount}`);
        await page.keyboard.press('Space');
        await page.waitForTimeout(8000);
        console.log(`  Bets seen: ${betCount}`);
      }
    } catch(e) {
      console.log(`  can't eval: ${e.message.slice(0, 60)}`);
    }
  }
  
  await browser.close();
})();
