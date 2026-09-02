const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Dump ALL window keys with their types
  const r = await page.evaluate(() => {
    const keys = Object.getOwnPropertyNames(window).filter(k => !k.startsWith('on') && k.length > 1 && k !== 'top' && k !== 'self' && k !== 'window' && k !== 'parent' && k !== 'frames' && k !== 'length');
    return keys.map(k => {
      try {
        const v = window[k];
        const t = typeof v;
        if (t === 'function') return { k, t: 'function', n: v.name || '?' };
        if (v === null) return { k, t: 'null' };
        if (v === undefined) return { k, t: 'undefined' };
        if (Array.isArray(v)) return { k, t: 'array', len: v.length };
        if (t === 'object') return { k, t: 'object', keys: Object.getOwnPropertyNames(v).slice(0, 5) };
        return { k, t, v: String(v).slice(0, 50) };
      } catch(e) { return { k, err: e.message }; }
    });
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
