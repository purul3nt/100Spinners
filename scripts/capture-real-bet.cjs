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

  // Capture ALL /play/bet requests with full body + headers
  const betRequests = [];
  page.on('request', async (req) => {
    if (req.url().includes('/play/bet') && req.method() === 'POST') {
      betRequests.push({
        url: req.url(),
        method: req.method(),
        headers: req.headers(),
        body: req.postData(),
      });
    }
  });

  // Capture all /play/bet responses
  const betResponses = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet')) {
      try {
        const body = await resp.json();
        betResponses.push({ url: resp.url(), status: resp.status(), body });
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
  console.log('frame:', gameFrame.url());

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(15000);

  // Dismiss splash
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(5000);

  // Try MANY positions to find SPIN
  console.log('Trying many positions...');
  const positions = [];
  for (let fy = 0.65; fy <= 0.95; fy += 0.05) {
    for (let fx = 0.40; fx <= 0.80; fx += 0.05) {
      positions.push([fx, fy]);
    }
  }
  for (const [fx, fy] of positions) {
    const x = cv.x + cv.w * fx;
    const y = cv.y + cv.h * fy;
    await page.mouse.click(x, y);
    await gameFrame.waitForTimeout(1500);
    if (betRequests.length > 0) {
      console.log(`HIT at (${fx},${fy}) -> bet captured!`);
      break;
    }
  }

  console.log(`\n=== Captured ${betRequests.length} bet requests ===`);
  for (let i = 0; i < Math.min(3, betRequests.length); i++) {
    const r = betRequests[i];
    console.log(`Request ${i}:`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Body: ${r.body}`);
    console.log(`  Headers: ${JSON.stringify(r.headers, null, 2).slice(0, 500)}`);
  }
  console.log(`\n=== Captured ${betResponses.length} bet responses ===`);
  for (let i = 0; i < Math.min(3, betResponses.length); i++) {
    const r = betResponses[i];
    console.log(`Response ${i}: status=${r.status}`);
    console.log(`  statusCode: ${r.body.statusCode}`);
    console.log(`  totalWinAmount: ${r.body.totalWinAmount}`);
    console.log(`  roundId: ${r.body.roundId}`);
    if (r.body.round) {
      console.log(`  round.status: ${r.body.round.status}`);
      console.log(`  round.events.length: ${r.body.round.events?.length || 0}`);
    }
    console.log(`  accountBalance: ${JSON.stringify(r.body.accountBalance)}`);
  }

  await page.screenshot({ path: '/tmp/capture-bet.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
