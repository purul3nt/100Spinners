const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Intercept script evaluation to capture the bundle and look at math-related keys
  const result = await page.evaluate(async () => {
    const out = {
      needlesKeys: [],
      hacksawCasinoKeys: [],
      pixiAvailable: typeof window.PIXI !== 'undefined',
      pixiVersion: window.PIXI?.VERSION,
      allGlobals: (() => {
        const interesting = [];
        for (const k of Object.keys(window)) {
          if (k.startsWith('on') || k === 'top' || k === 'self' || k === 'window' || k === 'parent') continue;
          if (/pixi|needle|hack|game|spin|casino|reel|symbol|pay/i.test(k)) {
            interesting.push({ k, t: typeof window[k] });
          }
        }
        return interesting;
      })(),
    };

    // needles is global
    if (window.needles) {
      try {
        out.needlesKeys = Object.keys(window.needles).slice(0, 50);
        // Try to find any state
        for (const k of Object.keys(window.needles)) {
          if (/model|state|store|engine|reel|game|math|symbol/i.test(k)) {
            try { out[`needles.${k}`] = String(window.needles[k]).slice(0, 300); } catch(e){}
          }
        }
      } catch(e) { out.needlesErr = e.message; }
    }

    // Look in nested namespaces too
    for (const k of ['pixi', 'PIXI', 'hacksaw', 'Hacksaw', 'hacksawCasino', 'HacksawCasino', 'reel', 'Reel']) {
      if (window[k] && typeof window[k] === 'object') {
        try { out[`${k}_keys`] = Object.keys(window[k]).slice(0, 50); } catch(e){}
      }
    }

    return out;
  });
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
