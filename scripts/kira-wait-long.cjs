const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error') console.log('[ERROR]', t.slice(0, 200));
  });
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });

  // Wait up to 30s for PIXI to appear
  for (let i = 1; i <= 30; i++) {
    await page.waitForTimeout(1000);
    const pixiLoaded = await page.evaluate(() => typeof window.PIXI !== 'undefined');
    if (pixiLoaded) {
      console.log(`PIXI loaded at t=${i}s`);
      break;
    }
  }
  // Dump after PIXI loads
  const r = await page.evaluate(() => {
    const out = { pixiLoaded: typeof window.PIXI !== 'undefined' };
    if (window.PIXI) {
      out.PIXI_keys = Object.keys(window.PIXI).slice(0, 50);
      // Check Application
      try {
        const inst = new window.PIXI.Application();
        out.Application_keys = Object.keys(inst).slice(0, 30);
        inst.destroy();
      } catch(e) { out.Application_err = e.message; }
    }
    // Look at hx_scope
    out.hx_scope_keys = Object.keys(window.$hx_scope || {});
    return out;
  });
  console.log(JSON.stringify(r, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
