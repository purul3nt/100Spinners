const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const r = await page.evaluate(() => {
    const out = {};
    // Look for Haxe globals with $hx_ prefix
    for (const k of Object.keys(window)) {
      if (k.startsWith('$hx_') || k === '$haxeUID') {
        out[k] = (() => {
          try {
            const v = window[k];
            if (typeof v === 'object' && v) {
              const keys = Object.keys(v).slice(0, 20);
              const dump = {};
              for (const sk of keys) {
                try {
                  const sv = v[sk];
                  if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
                    dump[sk] = `obj(keys=${Object.keys(sv).slice(0,10).join(',')})`;
                  } else {
                    dump[sk] = String(sv).slice(0, 80);
                  }
                } catch(e){}
              }
              return dump;
            }
            return String(v).slice(0, 80);
          } catch(e) { return e.message; }
        })();
      }
    }
    // Look at PIXI namespace
    if (window.PIXI) {
      out.PIXI_keys = Object.keys(window.PIXI).slice(0, 30);
      // Look at Application
      out.PIXI_Application_keys = window.PIXI.Application ? Object.keys(new window.PIXI.Application()).slice(0, 30) : null;
    } else {
      out.PIXI = 'not loaded';
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
