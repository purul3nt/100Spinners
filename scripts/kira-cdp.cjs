const { chromium } = require('playwright');
const cdp = require('chrome-remote-interface');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--remote-debugging-port=9222'] });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const targets = await cdp.List({ host: 'localhost', port: 9222 });
  console.log('targets:', targets.length);
  for (const t of targets.slice(0, 5)) console.log(' -', t.type, t.url);
  await browser.close();
})().catch(e => { console.error('CDP err:', e.message); process.exit(1); });
