const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture every network event with details
  const events = [];
  ctx.on('request', req => events.push({ kind: 'req', url: req.url(), method: req.method(), rt: req.resourceType(), frame: req.frame()?.url() }));
  ctx.on('response', async resp => {
    let body = null;
    try {
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('json') || ct.includes('javascript') || ct.includes('text')) {
        const b = await resp.body();
        body = b.toString('utf8').slice(0, 200000);
      }
    } catch (e) {}
    events.push({ kind: 'resp', url: resp.url(), status: resp.status(), ct: resp.headers()['content-type'], body, frame: resp.frame()?.url() });
  });

  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click and wait for the game frame to appear
  await page.click('span.js-launch-game');
  await page.waitForTimeout(8000);

  // All frames
  console.log('=== frames ===');
  for (const f of page.frames()) console.log(`  ${f.url()}`);

  // GameContainer children
  const container = await page.evaluate(() => {
    const gc = document.querySelector('.GameContainer');
    if (!gc) return null;
    return {
      outerHtml: gc.outerHTML.slice(0, 3000),
      iframeCount: gc.querySelectorAll('iframe').length,
      childTags: Array.from(gc.children).map(c => ({ tag: c.tagName, cls: c.className?.toString().slice(0, 60) })),
    };
  });
  console.log('\n=== GameContainer ===');
  console.log(JSON.stringify(container, null, 2));

  // Dump events filtered for game-related URLs
  console.log('\n=== game-related network events ===');
  for (const e of events) {
    if (/static-live|casino|hacksaw.*game|game-launch|launcher/i.test(e.url) || e.frame) {
      console.log(`  ${e.kind === 'resp' ? e.status : e.method} ${e.rt||e.ct||''} [frame=${(e.frame||'').slice(0,80)}]`);
      console.log(`    ${e.url.slice(0, 200)}`);
    }
  }

  // Save full event log
  fs.writeFileSync(`${OUT}/events.json`, JSON.stringify(events.map(e => ({ ...e, body: e.body ? e.body.slice(0, 5000) : null })), null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
