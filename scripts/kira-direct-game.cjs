const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture network events
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
  page.on('console', msg => console.log(`[console.${msg.type()}]`, msg.text().slice(0, 200)));
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  // Direct demo URL with required params
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop' +
    '&disablefooter=true&disabledemotext=true&disabledbetopenmenu=true';

  console.log('=== navigating directly to demo ===');
  console.log(demoUrl);

  try {
    await page.goto(demoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('=== initial DOM loaded ===');
  } catch (e) {
    console.log('=== initial nav error:', e.message);
  }
  await page.waitForTimeout(10000);

  // Check what's loaded
  const title = await page.title();
  console.log('page title:', title);
  const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
  console.log('canvas count:', canvasCount);

  const dump = await page.evaluate(() => {
    const out = {
      url: location.href,
      title: document.title,
      bodyText: (document.body?.innerText || '').slice(0, 800),
      canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({ w: c.width, h: c.height })),
      scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).slice(0, 20),
      globals: Object.keys(window).filter(k => /game|hack|slot|spin|reel|math|rng|pixi|phaser|three/i.test(k)).slice(0, 50),
      h1h2: Array.from(document.querySelectorAll('h1,h2,.loader-text,.error,.title')).slice(0,5).map(e => e.textContent.trim().slice(0, 100)),
    };
    return out;
  });
  console.log(JSON.stringify(dump, null, 2));

  await page.screenshot({ path: `${OUT}/04-direct-game.png` });

  // Save events
  fs.writeFileSync(`${OUT}/direct-events.json`, JSON.stringify(events.map(e => ({ ...e, body: e.body ? e.body.slice(0, 5000) : null })), null, 2));

  // Print unique responses
  const seen = new Set();
  for (const e of events) {
    if (e.kind !== 'resp') continue;
    const k = `${e.status} ${(e.ct||'').slice(0,30)} ${e.url}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  ${e.status} ${(e.ct||'').slice(0,30)} ${e.url.slice(0, 200)}`);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
