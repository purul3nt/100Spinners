const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Search for any globally accessible state with math
  const r = await page.evaluate(() => {
    const out = {
      pixiKeys: window.PIXI ? Object.getOwnPropertyNames(window.PIXI).slice(0, 30) : null,
      appCount: (window.PIXI?.Application ? 1 : 0),
    };
    // Look at the canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Some PIXI apps attach themselves to canvas
      out.canvasDataAttrs = Array.from(canvas.attributes).map(a => `${a.name}=${a.value.slice(0,80)}`);
      out.canvasParent = canvas.parentElement?.id || canvas.parentElement?.className?.toString().slice(0,80);
    }
    // Check for global app state
    const keys = Object.keys(window).filter(k => !k.startsWith('on') && k.length > 2);
    out.allWindowKeys = keys.length;
    // Look for interesting ones
    const interesting = keys.filter(k => /pixi|app|game|hack|reel|engine|state|store|casino|spin|symbol|wild/i.test(k));
    out.interestingKeys = interesting;
    // Dump them
    for (const k of interesting.slice(0, 30)) {
      try {
        const v = window[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          out[`${k}_keys`] = Object.getOwnPropertyNames(v).slice(0, 40);
        } else {
          out[k] = typeof v;
        }
      } catch(e){}
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
