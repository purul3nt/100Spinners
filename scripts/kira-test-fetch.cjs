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

  // Capture all network responses including RGS
  const allResponses = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('rgs-') && resp.status() === 200) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await resp.json();
          allResponses.push({ url, body, status: resp.status() });
        }
      } catch (e) {}
    }
  });

  console.log('Navigate...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(30000);

  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) {
      gameFrame = f;
    }
  }
  if (!gameFrame) { console.log('no frame'); await browser.close(); return; }

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(10000);

  // Dismiss splash
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(5000);

  // Save all captured RGS responses
  console.log(`Captured ${allResponses.length} RGS responses`);
  fs.writeFileSync('/tmp/test-fetch-responses.json', JSON.stringify(allResponses, null, 2));
  for (const r of allResponses) {
    console.log(`  ${r.url.split('/').pop()} -> status ${r.status}`);
    if (r.body && r.body.sessionUuid) {
      console.log(`    SESSION UUID: ${r.body.sessionUuid}`);
    }
  }

  // Try direct fetch to /play/bet
  console.log('\nTrying direct fetch to /play/bet from iframe...');
  try {
    const result = await gameFrame.evaluate(async () => {
      // Get any sessionUuid from auth response
      const auth = await fetch('https://rgs-demo.hacksawgaming.com/api/play/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 1760, currency: 'EUR', mode: 2 }),
      }).then(r => r.json()).catch(e => ({error: String(e)}));
      return auth;
    });
    console.log('Auth result:', JSON.stringify(result).slice(0, 500));
  } catch (e) {
    console.log('Auth err:', e.message);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
