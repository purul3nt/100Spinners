const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const r = await page.evaluate(() => {
    const out = { needlesType: typeof window.Needles, needlesKeys: [] };
    if (window.Needles) {
      try { out.needlesKeys = Object.getOwnPropertyNames(window.Needles).slice(0, 100); } catch(e){}
      // Look for any namespaces that have math
      for (const k of out.needlesKeys) {
        const v = window.Needles[k];
        if (v && typeof v === 'object') {
          try {
            const subKeys = Object.keys(v).slice(0, 20);
            out[`Needles.${k}`] = subKeys;
            // If it has math-y keys, dump values
            if (subKeys.some(s => /reel|symbol|pay|win|spin|multiplier|ladder|scatter|wild/i.test(s))) {
              const sub = {};
              for (const sk of subKeys) {
                try {
                  const sv = v[sk];
                  if (typeof sv === 'object') sub[sk] = Object.keys(sv).slice(0, 30);
                  else sub[sk] = String(sv).slice(0, 200);
                } catch(e){}
              }
              out[`Needles.${k}_detail`] = sub;
            }
          } catch(e){}
        }
      }
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
