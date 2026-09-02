const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1707, height: 960 } });
  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await context.newPage();
  
  const rgsCalls = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/play/') || url.includes('rgs-')) {
      rgsCalls.push({
        url: url.split('/').slice(-3).join('/'),
        status: resp.status(),
        time: Date.now(),
      });
    }
  });
  
  console.log('Navigating...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await (await page.$('span.js-launch-game')).click();
  console.log('Clicked launcher, waiting 50s...');
  await page.waitForTimeout(50000);
  
  console.log('\nRGS calls seen:');
  for (const c of rgsCalls) {
    console.log(`  [${c.status}] ${c.url}`);
  }
  
  // Check console errors
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text().slice(0, 100)}`));
  
  // Now try forcing a bet via JS injection
  console.log('\nTrying direct JS bet call...');
  try {
    const result = await page.evaluate(async () => {
      // Find the global bet function
      const win = window;
      const keys = Object.keys(win).filter(k => k.toLowerCase().includes('bet') || k.toLowerCase().includes('spin') || k.toLowerCase().includes('play'));
      return keys;
    });
    console.log('Window keys with bet/spin/play:', result);
  } catch(e) {
    console.log('Eval failed:', e.message);
  }
  
  await browser.close();
})();
