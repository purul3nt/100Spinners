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

  const betReqs = [];
  page.on('request', (req) => {
    if (req.url().includes('/play/bet') && req.method() === 'POST') {
      betReqs.push({ url: req.url(), headers: req.headers(), body: req.postData() });
    }
  });
  const allPosts = [];
  page.on('request', (req) => {
    if (req.url().includes('rgs-') && req.method() === 'POST') {
      allPosts.push({ url: req.url(), body: req.postData() });
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

  // Dismiss splash
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(3000);

  // Try keyboard Space
  console.log('Focus canvas and try Space');
  await gameFrame.focus('canvas');
  await page.keyboard.press('Space');
  await gameFrame.waitForTimeout(8000);
  console.log(`After Space: ${betReqs.length} bet reqs, ${allPosts.length} total RGS posts`);

  // Try Enter
  if (betReqs.length === 0) {
    console.log('Try Enter');
    await gameFrame.focus('canvas');
    await page.keyboard.press('Enter');
    await gameFrame.waitForTimeout(8000);
    console.log(`After Enter: ${betReqs.length} bet reqs`);
  }

  // Try with mouse hover first
  if (betReqs.length === 0) {
    console.log('Try mouse hover then click at exact SPIN position');
    const x = cv.x + cv.w * 0.521;
    const y = cv.y + cv.h * 0.943;
    await page.mouse.move(x, y);
    await page.waitForTimeout(500);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await gameFrame.waitForTimeout(8000);
    console.log(`After mouse: ${betReqs.length} bet reqs`);
  }

  // Show all RGS posts so far
  console.log(`\nAll RGS posts (${allPosts.length}):`);
  for (const p of allPosts) {
    console.log(`  ${p.url.split('/').pop()} ${(p.body || '').slice(0, 100)}`);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
