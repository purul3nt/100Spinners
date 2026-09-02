const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Dump everything about the Play element & launcher global
  const dump = await page.evaluate(() => {
    const play = document.querySelector('.Play.transformOnLoad');
    const btn  = document.querySelector('span.js-launch-game');
    return {
      playOuterHtml: play?.outerHTML.slice(0, 800),
      playAttrs: play ? Array.from(play.attributes).map(a => `${a.name}=${a.value.slice(0, 80)}`) : null,
      btnAttrs: btn ? Array.from(btn.attributes).map(a => `${a.name}=${a.value.slice(0, 80)}`) : null,
      btnParent: btn?.parentElement?.outerHTML?.slice(0, 600),
      Hacksaw: (() => {
        const h = window.Hacksaw;
        if (!h) return null;
        return {
          type: typeof h,
          ctor: h.constructor?.name,
          ownKeys: Object.getOwnPropertyNames(h),
          protoKeys: h.prototype ? Object.getOwnPropertyNames(h.prototype) : null,
          sampleMethods: Object.keys(h).filter(k => typeof h[k] === 'function').slice(0, 30).reduce((o,k)=>{o[k]=h[k].toString().slice(0,200);return o;},{}),
        };
      })(),
      hacksaw: window.hacksaw ? Object.keys(window.hacksaw) : null,
    };
  });
  console.log(JSON.stringify(dump, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
