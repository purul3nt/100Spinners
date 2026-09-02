const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa/bundles';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const bundles = [];
  ctx.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/1760/') && (url.endsWith('.js') || url.endsWith('.json'))) {
      let body = null;
      try {
        body = await resp.body();
      } catch (e) { body = null; }
      if (body) {
        const name = url.split('/').slice(-2).join('-').replace(/[^a-zA-Z0-9.-]/g, '_');
        fs.writeFileSync(`${OUT}/${name}`, body);
        bundles.push({ url, size: body.length });
      }
    }
  });

  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);

  console.log('=== bundles fetched ===');
  for (const b of bundles) console.log(`  ${b.size} bytes  ${b.url}`);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
