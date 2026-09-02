const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true, channel: 'chromium',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }, locale: 'en-US', ignoreHTTPSErrors: true,
  });
  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await context.newPage();

  const betResps = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet') && resp.status() === 200) {
      try {
        const body = await resp.json();
        betResps.push(body);
      } catch (e) {}
    }
  });

  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(35000);

  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) gameFrame = f;
  }
  if (!gameFrame) { console.log('no frame'); await browser.close(); return; }

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(15000);
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(3000);
  await gameFrame.focus('canvas');

  // Three spins
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(4000);
  }

  console.log(`Captured ${betResps.length} bet responses`);
  for (let i = 0; i < betResps.length; i++) {
    const r = betResps[i];
    console.log(`\n=== Spin ${i} ===`);
    console.log(`Status: ${r.statusCode} TotalWin: ${r.totalWinAmount} RoundId: ${r.roundId}`);
    if (r.round) {
      console.log(`Round status: ${r.round.status}`);
      console.log(`Events: ${r.round.events?.length || 0}`);
      for (let j = 0; j < (r.round.events || []).length; j++) {
        const ev = r.round.events[j];
        console.log(`  Event ${j}: et=${ev.et} etn=${ev.etn} wa=${ev.wa} awa=${ev.awa} bc=${ev.bc} wc=${ev.wc}`);
      }
    }
    console.log(`AccountBalance: ${JSON.stringify(r.accountBalance)}`);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
