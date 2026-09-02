const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Dump Hacksaw global API surface.
  const api = await page.evaluate(() => {
    const h = window.Hacksaw || window.hacksaw;
    if (!h) return { found: false };
    return {
      found: true,
      type: typeof h,
      keys: Object.keys(h),
      methods: Object.keys(h).filter(k => typeof h[k] === 'function'),
      protoKeys: h.prototype ? Object.getOwnPropertyNames(h.prototype) : null,
      stringified: (() => { try { return JSON.stringify(h, (k, v) => typeof v === 'function' ? `[fn ${v.name}]` : v, 2).slice(0, 4000); } catch (e) { return `<<err: ${e.message}>>`; } })(),
    };
  });
  console.log('=== Hacksaw global API ===');
  console.log(JSON.stringify(api, null, 2).slice(0, 4000));

  // Capture network requests while we trigger the launch.
  const requests = [];
  ctx.on('request', req => requests.push({ url: req.url(), method: req.method(), rt: req.resourceType() }));
  ctx.on('response', resp => requests.push({ url: resp.url(), status: resp.status(), rt: resp.headers()['content-type'] }));

  // Click "Try it"
  console.log('\n=== clicking js-launch-game ===');
  await page.click('span.js-launch-game');
  await page.waitForTimeout(8000);

  // Screenshot after launch
  await page.screenshot({ path: `${OUT}/03-after-launch.png` });

  // Inspect all iframes and their URLs
  const frames = page.frames();
  console.log(`\n=== ${frames.length} frames ===`);
  for (const f of frames) {
    console.log(`  url=${f.url().slice(0, 200)}`);
  }

  // Look for game-specific globals inside the game frame
  for (const f of frames) {
    if (f.url().includes('static-live') || f.url().includes('casino') || f.url().includes('hacksaw')) {
      try {
        const info = await f.evaluate(() => {
          const out = {
            url: location.href,
            title: document.title,
            canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({ w: c.width, h: c.height })),
            globals: Object.keys(window).filter(k => /game|hack|slot|spin|reel|math|rng/i.test(k)).slice(0, 50),
            scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).slice(0, 20),
            bodyText: (document.body?.innerText || '').slice(0, 500),
          };
          return out;
        });
        console.log(`\n=== game frame info ===`);
        console.log(JSON.stringify(info, null, 2).slice(0, 4000));
      } catch (e) { console.log('frame eval err:', e.message); }
    }
  }

  // Show all unique requests
  const seen = new Map();
  for (const r of requests) {
    const key = r.url.split('?')[0];
    if (!seen.has(key)) seen.set(key, r);
  }
  console.log('\n=== unique requests ===');
  for (const [u, r] of [...seen.entries()].slice(0, 40)) {
    console.log(`  ${(r.status||r.method||'?')} ${(r.rt||'').slice(0, 30)} ${u.slice(0, 180)}`);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
