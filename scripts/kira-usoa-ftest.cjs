const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1707, height: 960 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await context.newPage();
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/play/')) {
      console.log(`[${resp.status()}] ${url.split('/').pop()}`);
      if (url.endsWith('/authenticate') || url.endsWith('/bet')) {
        try {
          const body = await resp.text();
          const j = JSON.parse(body);
          if (j.sessionUuid) console.log(`  session: ${j.sessionUuid}`);
          if (j.balance !== undefined) console.log(`  balance: ${j.balance}`);
          if (j.statusCode !== undefined) console.log(`  statusCode: ${j.statusCode}`);
        } catch (e) {}
      }
    }
  });
  page.on('console', msg => {
    if (msg.text().includes('Connection') || msg.text().includes('session')) console.log(`CONSOLE: ${msg.text()}`);
  });
  
  console.log('Navigating...');
  try {
    await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Page loaded, waiting for iframe...');
    await page.waitForTimeout(5000);
    const hasLauncher = await page.$('span.js-launch-game');
    if (hasLauncher) {
      await hasLauncher.click();
      console.log('Clicked launcher, waiting 35s for RGS handshake...');
      await page.waitForTimeout(35000);
      const iframeCount = await page.$$eval('iframe', frames => frames.length);
      console.log(`Iframes: ${iframeCount}`);
      // Try to find canvas
      const canvasInfo = await page.evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        return Array.from(canvases).map(c => ({ w: c.width, h: c.height, visible: c.offsetWidth > 0 }));
      });
      console.log('Canvases:', JSON.stringify(canvasInfo));
    } else {
      console.log('No launcher found');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  await browser.close();
})();
