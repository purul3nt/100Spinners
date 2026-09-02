const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture ALL network events including websocket
  const events = [];
  ctx.on('request', req => events.push({ kind: 'req', url: req.url(), method: req.method(), rt: req.resourceType() }));
  ctx.on('response', async resp => {
    let body = null;
    try {
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('json') || ct.includes('javascript') || ct.includes('text')) {
        const b = await resp.body();
        body = b.toString('utf8').slice(0, 200000);
      }
    } catch (e) {}
    events.push({ kind: 'resp', url: resp.url(), status: resp.status(), ct: resp.headers()['content-type'], body });
  });
  page.on('websocket', ws => {
    console.log('[ws open]', ws.url());
    ws.on('framesent', f => console.log('[ws sent]', String(f.payload || '').slice(0, 200)));
    ws.on('framereceived', f => console.log('[ws recv]', String(f.payload || '').slice(0, 200)));
  });
  page.on('console', msg => console.log(`[console.${msg.type()}]`, msg.text().slice(0, 300)));
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';

  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
  console.log('[kira] initial DOM loaded, waiting for game...');

  // Wait for canvas or 25s, whichever first
  for (let i = 1; i <= 25; i++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const withSize = Array.from(canvases).filter(c => c.width > 50);
      return {
        canvasCount: canvases.length,
        canvasWithSize: withSize.length,
        firstCanvasSize: withSize[0] ? [withSize[0].width, withSize[0].height] : null,
        loaderExists: !!document.querySelector('.loader, [class*="loading"], [class*="spinner"]'),
        loaderDisplay: (() => {
          const l = document.querySelector('.loader, [class*="loading"]');
          return l ? getComputedStyle(l).display : null;
        })(),
        bodyHasContent: (document.body.innerText || '').trim().slice(0, 200),
      };
    });
    console.log(`t=${i}s:`, JSON.stringify(info));
    if (info.canvasWithSize >= 1) {
      console.log('[kira] canvas appeared at t=', i);
      break;
    }
  }

  // Now try to find spin button
  const layout = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button, [role="button"], .btn, [class*="spin"], [class*="Spin"]'));
    return all.slice(0, 30).map(el => ({
      tag: el.tagName.toLowerCase(),
      cls: el.className?.toString().slice(0, 100),
      id: el.id,
      text: (el.textContent || '').trim().slice(0, 80),
      visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      rect: el.getBoundingClientRect ? JSON.stringify(el.getBoundingClientRect()) : null,
    }));
  });
  console.log('=== buttons ===');
  for (const b of layout) console.log(' ', JSON.stringify(b));

  await page.screenshot({ path: `${OUT}/05-game-loaded.png` });

  // Save full events
  fs.writeFileSync(`${OUT}/game-events.json`, JSON.stringify(events.map(e => ({ ...e, body: e.body ? e.body.slice(0, 5000) : null })), null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
