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

  let sessionUuid = null;
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/authenticate') && resp.status() === 200) {
      try {
        const body = await resp.json();
        if (body.sessionUuid) sessionUuid = body.sessionUuid;
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
  if (!gameFrame || !sessionUuid) { console.log('boot fail'); await browser.close(); return; }
  console.log('Session:', sessionUuid);

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(15000);
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(3000);

  // Try multiple seqs
  for (const seq of [1, 5, 10, 20, 30, 50, 100, 200]) {
    const result = await gameFrame.evaluate(async ({ seq, sessionUuid }) => {
      const payload = {
        seq, sessionUuid,
        bets: [{ betAmount: '200' }],
        offerId: null, promotionId: null, autoplay: false,
      };
      const r = await fetch('https://rgs-demo.hacksawgaming.com/api/play/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await r.json();
      return body;
    }, { seq, sessionUuid });
    
    const ok = result.statusCode === 0;
    const eventCount = result.round?.events?.length || 0;
    const totalWin = result.totalWinAmount || '0';
    const roundId = result.roundId || result.round?.roundId;
    console.log(`seq=${seq}: statusCode=${result.statusCode} msg="${(result.statusMessage||'').slice(0,40)}" roundId=${roundId} events=${eventCount} win=${totalWin} bal=${result.accountBalance?.balance}`);
    if (ok && eventCount > 0) {
      console.log('  FULL ROUND:', JSON.stringify(result.round, null, 2).slice(0, 2000));
      break;
    }
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
