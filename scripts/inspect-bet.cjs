const { chromium } = require('playwright');
const fs = require('fs');

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

  const betReqs = [];
  page.on('request', (req) => {
    if (req.url().includes('/play/bet') && req.method() === 'POST') {
      betReqs.push({ url: req.url(), headers: req.headers(), body: req.postData() });
    }
  });
  const betResps = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet')) {
      try {
        const body = await resp.json();
        betResps.push({ status: resp.status(), body });
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

  // Trigger Space to get one real bet
  await gameFrame.focus('canvas');
  await page.keyboard.press('Space');
  await gameFrame.waitForTimeout(8000);

  console.log(`Captured ${betReqs.length} bet reqs`);
  for (let i = 0; i < betReqs.length; i++) {
    const r = betReqs[i];
    console.log(`\n=== Bet Request ${i} ===`);
    console.log(`URL: ${r.url}`);
    console.log(`Headers:`);
    console.log(JSON.stringify(r.headers, null, 2));
    console.log(`Body: ${r.body}`);
  }
  console.log(`\n=== Bet Response ${betResps.length} ===`);
  for (let i = 0; i < betResps.length; i++) {
    const r = betResps[i];
    console.log(`Status: ${r.status}`);
    console.log(`statusCode: ${r.body.statusCode}`);
    console.log(`totalWinAmount: ${r.body.totalWinAmount}`);
    console.log(`roundId: ${r.body.roundId}`);
    console.log(`round: ${JSON.stringify(r.body.round).slice(0, 2000)}`);
    console.log(`accountBalance: ${JSON.stringify(r.body.accountBalance)}`);
  }

  // Save to disk
  fs.writeFileSync('/tmp/bet-req-resp.json', JSON.stringify({ reqs: betReqs, resps: betResps }, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
