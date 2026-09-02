const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const apiEvents = [];
  ctx.on('request', req => {
    const url = req.url();
    if (/api|rgs|casino|game|spin|play|bet/i.test(url)) {
      apiEvents.push({ kind: 'req', url, method: req.method(), rt: req.resourceType(), postData: req.postData() });
    }
  });
  ctx.on('response', async resp => {
    const url = resp.url();
    if (/api|rgs|casino|game|spin|play|bet/i.test(url)) {
      let body = null;
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('json') || ct.includes('text')) {
          const b = await resp.body();
          body = b.toString('utf8').slice(0, 50000);
        }
      } catch (e) {}
      apiEvents.push({ kind: 'resp', url, status: resp.status(), ct: resp.headers()['content-type'], body });
    }
  });
  page.on('console', msg => { if (msg.type() === 'error' || msg.text().length < 200) console.log(`[c.${msg.type()}]`, msg.text().slice(0, 200)); });
  page.on('websocket', ws => {
    console.log('[ws open]', ws.url());
    ws.on('framesent', f => console.log('[ws sent]', String(f.payload || '').slice(0, 250)));
    ws.on('framereceived', f => console.log('[ws recv]', String(f.payload || '').slice(0, 250)));
    ws.on('close', () => console.log('[ws close]'));
  });

  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';

  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Inspect all globals & game internals
  const inspect = await page.evaluate(() => {
    const out = {
      title: document.title,
      canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({ w: c.width, h: c.height, id: c.id, cls: c.className?.toString() })),
      placeBetBtn: (() => {
        const b = document.querySelector('#PlaceBetBtn');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { visible: r.width > 0, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
      })(),
      globals: Object.keys(window).filter(k => !k.startsWith('on') && k.length > 2).slice(0, 100),
      needlesLoaded: typeof window.needles !== 'undefined' || typeof window.Needles !== 'undefined',
      pixiLoaded: typeof window.PIXI !== 'undefined',
      pixiVersion: window.PIXI?.VERSION,
      appKey: (() => {
        // Find any global app state
        for (const k of ['app', 'App', 'game', 'Game', 'state', 'State', 'store', 'Store', 'casino', 'Casino']) {
          if (window[k] && typeof window[k] === 'object') return { key: k, type: typeof window[k] };
        }
        return null;
      })(),
    };
    return out;
  });
  console.log('=== inspect ===');
  console.log(JSON.stringify(inspect, null, 2));

  // Try clicking PlaceBetBtn
  console.log('\n=== clicking PlaceBetBtn ===');
  try {
    await page.click('#PlaceBetBtn', { force: true, timeout: 3000 });
    console.log('clicked');
  } catch (e) { console.log('click err:', e.message); }
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/06-after-click.png` });

  // More globals after click
  const after = await page.evaluate(() => {
    return {
      placeBetVisible: (() => { const r = document.querySelector('#PlaceBetBtn')?.getBoundingClientRect(); return r ? r.width > 0 : null; })(),
      stopBtnVisible: (() => { const r = document.querySelector('#StopBtn')?.getBoundingClientRect(); return r ? r.width > 0 : null; })(),
      balanceEl: document.querySelector('[class*="balance"], [class*="Balance"]')?.textContent?.trim().slice(0, 50),
      winEl: document.querySelector('[class*="win"], [class*="Win"]')?.textContent?.trim().slice(0, 50),
    };
  });
  console.log('\n=== after click ===');
  console.log(JSON.stringify(after, null, 2));

  fs.writeFileSync(`${OUT}/api-events.json`, JSON.stringify(apiEvents, null, 2));
  console.log(`\n[kira] api events: ${apiEvents.length}`);
  // Show unique api URLs
  const seen = new Set();
  for (const e of apiEvents) {
    if (e.kind !== 'resp') continue;
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    console.log(`  ${e.status} ${(e.ct||'').slice(0,30)} ${e.url.slice(0, 200)}`);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
